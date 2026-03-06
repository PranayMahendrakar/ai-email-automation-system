"""
Gmail API Integration Module
AI Email Automation System
"""

import os
import base64
import json
import pickle
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Optional
from datetime import datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


# Gmail API Scopes
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels'
]


class GmailClient:
    """Handles all Gmail API interactions."""
    
    def __init__(self, credentials_file: str = 'credentials.json', token_file: str = 'token.pickle'):
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.service = None
        self.user_email = None
        self._authenticate()
    
    def _authenticate(self):
        """Authenticate with Gmail API using OAuth2."""
        creds = None
        
        if os.path.exists(self.token_file):
            with open(self.token_file, 'rb') as token:
                creds = pickle.load(token)
        
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(self.credentials_file):
                    raise FileNotFoundError(
                        f"credentials.json not found. Download it from Google Cloud Console."
                    )
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, SCOPES
                )
                creds = flow.run_local_server(port=0)
            
            with open(self.token_file, 'wb') as token:
                pickle.dump(creds, token)
        
        self.service = build('gmail', 'v1', credentials=creds)
        profile = self.service.users().getProfile(userId='me').execute()
        self.user_email = profile['emailAddress']
        print(f"Authenticated as: {self.user_email}")
    
    def get_messages(self, max_results: int = 50, query: str = 'in:inbox') -> List[Dict]:
        """Fetch emails from Gmail inbox."""
        try:
            results = self.service.users().messages().list(
                userId='me', maxResults=max_results, q=query
            ).execute()
            
            messages = results.get('messages', [])
            full_messages = []
            
            for msg in messages:
                full_msg = self.service.users().messages().get(
                    userId='me', id=msg['id'], format='full'
                ).execute()
                
                parsed = self._parse_message(full_msg)
                full_messages.append(parsed)
            
            return full_messages
        
        except HttpError as e:
            print(f"Gmail API error: {e}")
            return []
    
    def _parse_message(self, message: Dict) -> Dict:
        """Parse Gmail message into structured format."""
        headers = {h['name']: h['value'] for h in message['payload']['headers']}
        
        body = self._extract_body(message['payload'])
        
        return {
            'id': message['id'],
            'thread_id': message['threadId'],
            'from': headers.get('From', ''),
            'to': headers.get('To', ''),
            'subject': headers.get('Subject', '(No Subject)'),
            'date': headers.get('Date', ''),
            'body': body,
            'snippet': message.get('snippet', ''),
            'labels': message.get('labelIds', []),
            'unread': 'UNREAD' in message.get('labelIds', []),
            'has_attachment': self._has_attachment(message['payload'])
        }
    
    def _extract_body(self, payload: Dict) -> str:
        """Extract text body from email payload."""
        if payload.get('body', {}).get('data'):
            data = payload['body']['data']
            return base64.urlsafe_b64decode(data.encode('ASCII')).decode('utf-8', errors='ignore')
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part.get('mimeType') == 'text/plain':
                    data = part.get('body', {}).get('data', '')
                    if data:
                        return base64.urlsafe_b64decode(data.encode('ASCII')).decode('utf-8', errors='ignore')
                body = self._extract_body(part)
                if body:
                    return body
        
        return payload.get('snippet', '')
    
    def _has_attachment(self, payload: Dict) -> bool:
        """Check if email has attachments."""
        if 'parts' in payload:
            for part in payload['parts']:
                if part.get('filename'):
                    return True
        return False
    
    def send_email(self, to: str, subject: str, body: str, html: bool = False) -> Optional[Dict]:
        """Send an email via Gmail API."""
        try:
            message = MIMEMultipart('alternative') if html else MIMEText(body)
            message['to'] = to
            message['from'] = self.user_email
            message['subject'] = subject
            
            if html:
                text_part = MIMEText(body, 'plain')
                html_part = MIMEText(body, 'html')
                message.attach(text_part)
                message.attach(html_part)
            
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            result = self.service.users().messages().send(
                userId='me', body={'raw': raw}
            ).execute()
            
            print(f"Email sent! ID: {result['id']}")
            return result
        
        except HttpError as e:
            print(f"Failed to send email: {e}")
            return None
    
    def send_reply(self, original_message_id: str, thread_id: str, 
                   to: str, subject: str, body: str) -> Optional[Dict]:
        """Send a reply to an existing thread."""
        try:
            message = MIMEText(body)
            message['to'] = to
            message['from'] = self.user_email
            message['subject'] = 'Re: ' + subject.replace('Re: ', '')
            message['In-Reply-To'] = original_message_id
            message['References'] = original_message_id
            
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            result = self.service.users().messages().send(
                userId='me',
                body={'raw': raw, 'threadId': thread_id}
            ).execute()
            
            return result
        
        except HttpError as e:
            print(f"Failed to send reply: {e}")
            return None
    
    def mark_as_read(self, message_id: str) -> bool:
        """Mark an email as read."""
        try:
            self.service.users().messages().modify(
                userId='me', id=message_id,
                body={'removeLabelIds': ['UNREAD']}
            ).execute()
            return True
        except HttpError:
            return False
    
    def add_label(self, message_id: str, label_name: str) -> bool:
        """Add a label to an email (creates label if doesn't exist)."""
        try:
            label_id = self._get_or_create_label(label_name)
            if label_id:
                self.service.users().messages().modify(
                    userId='me', id=message_id,
                    body={'addLabelIds': [label_id]}
                ).execute()
                return True
        except HttpError:
            pass
        return False
    
    def _get_or_create_label(self, label_name: str) -> Optional[str]:
        """Get label ID or create if it doesn't exist."""
        try:
            labels = self.service.users().labels().list(userId='me').execute()
            for label in labels.get('labels', []):
                if label['name'].lower() == label_name.lower():
                    return label['id']
            
            # Create the label
            created = self.service.users().labels().create(
                userId='me',
                body={'name': label_name, 'labelListVisibility': 'labelShow',
                      'messageListVisibility': 'show'}
            ).execute()
            return created['id']
        
        except HttpError:
            return None
    
    def archive_email(self, message_id: str) -> bool:
        """Archive an email (remove from inbox)."""
        try:
            self.service.users().messages().modify(
                userId='me', id=message_id,
                body={'removeLabelIds': ['INBOX']}
            ).execute()
            return True
        except HttpError:
            return False
    
    def get_thread(self, thread_id: str) -> Optional[Dict]:
        """Get full email thread."""
        try:
            thread = self.service.users().threads().get(
                userId='me', id=thread_id, format='full'
            ).execute()
            return thread
        except HttpError:
            return None
    
    def search_emails(self, query: str, max_results: int = 20) -> List[Dict]:
        """Search emails with Gmail query syntax."""
        return self.get_messages(max_results=max_results, query=query)
    
    def get_unread_count(self) -> int:
        """Get number of unread emails in inbox."""
        try:
            results = self.service.users().messages().list(
                userId='me', q='is:unread in:inbox', maxResults=1
            ).execute()
            return results.get('resultSizeEstimate', 0)
        except HttpError:
            return 0
    
    def batch_mark_read(self, message_ids: List[str]) -> bool:
        """Mark multiple emails as read."""
        try:
            self.service.users().messages().batchModify(
                userId='me',
                body={'ids': message_ids, 'removeLabelIds': ['UNREAD']}
            ).execute()
            return True
        except HttpError:
            return False


class GmailWebhook:
    """Handles Gmail push notifications via Google Pub/Sub."""
    
    def __init__(self, gmail_client: GmailClient, topic_name: str):
        self.client = gmail_client
        self.topic_name = topic_name
    
    def setup_watch(self) -> Dict:
        """Setup Gmail push notifications."""
        try:
            result = self.client.service.users().watch(
                userId='me',
                body={
                    'labelIds': ['INBOX'],
                    'topicName': self.topic_name,
                    'labelFilterAction': 'include'
                }
            ).execute()
            print(f"Watch setup: expires {result.get('expiration')}")
            return result
        except HttpError as e:
            print(f"Failed to setup watch: {e}")
            return {}
    
    def stop_watch(self):
        """Stop Gmail push notifications."""
        try:
            self.client.service.users().stop(userId='me').execute()
            print("Watch stopped")
        except HttpError as e:
            print(f"Failed to stop watch: {e}")
    
    def process_notification(self, notification_data: bytes) -> Optional[List[Dict]]:
        """Process incoming Pub/Sub notification."""
        data = json.loads(base64.b64decode(notification_data).decode())
        email_address = data.get('emailAddress')
        history_id = data.get('historyId')
        
        if email_address and history_id:
            try:
                history = self.client.service.users().history().list(
                    userId='me',
                    startHistoryId=str(int(history_id) - 10),
                    historyTypes=['messageAdded'],
                    labelId='INBOX'
                ).execute()
                
                new_messages = []
                for record in history.get('history', []):
                    for msg in record.get('messagesAdded', []):
                        full_msg = self.client.service.users().messages().get(
                            userId='me', id=msg['message']['id'], format='full'
                        ).execute()
                        new_messages.append(self.client._parse_message(full_msg))
                
                return new_messages
            except HttpError:
                pass
        
        return None
