"""
Flask Backend Server for AI Email Automation System
Provides REST API endpoints for email processing, Gmail integration, and AI features
"""

import os
import json
import logging
from typing import Optional
from functools import wraps
from datetime import datetime

from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS

from email_processor import EmailProcessor, EmailAnalysis
from gmail_api import GmailClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='.', template_folder='.')
CORS(app)

# ---- Application State ----
processor: Optional[EmailProcessor] = None
gmail_client: Optional[GmailClient] = None


def init_processor():
    global processor
    openai_key = os.getenv('OPENAI_API_KEY')
    tone = os.getenv('DEFAULT_REPLY_TONE', 'professional')
    processor = EmailProcessor(openai_key=openai_key, default_tone=tone)
    logger.info(f"Email processor initialized (AI: {'OpenAI' if openai_key else 'Rule-based'})")


def require_gmail(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not gmail_client:
            return jsonify({'error': 'Gmail not connected. Call /api/gmail/connect first'}), 401
        return f(*args, **kwargs)
    return decorated_function


def require_processor(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not processor:
            init_processor()
        return f(*args, **kwargs)
    return decorated_function


# ---- Static File Routes ----
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)


# ---- Health & Status ----
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'ai_provider': 'openai' if (processor and processor.openai_processor) else 'rule-based',
        'gmail_connected': gmail_client is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        'processor_ready': processor is not None,
        'gmail_connected': gmail_client is not None,
        'openai_available': bool(os.getenv('OPENAI_API_KEY')),
        'server_time': datetime.now().isoformat()
    })


# ---- Gmail Authentication ----
@app.route('/api/gmail/connect', methods=['POST'])
def connect_gmail():
    global gmail_client
    try:
        gmail_client = GmailClient()
        return jsonify({
            'success': True,
            'message': f'Connected as {gmail_client.user_email}',
            'user_email': gmail_client.user_email
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/gmail/disconnect', methods=['POST'])
def disconnect_gmail():
    global gmail_client
    gmail_client = None
    return jsonify({'success': True, 'message': 'Gmail disconnected'})


# ---- Email Operations ----
@app.route('/api/emails', methods=['GET'])
@require_gmail
def get_emails():
    try:
        max_results = int(request.args.get('max', 50))
        query = request.args.get('q', 'in:inbox')
        
        emails = gmail_client.get_messages(max_results=max_results, query=query)
        return jsonify({
            'success': True,
            'count': len(emails),
            'emails': emails
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/emails/search', methods=['GET'])
@require_gmail
def search_emails():
    try:
        query = request.args.get('q', '')
        max_results = int(request.args.get('max', 20))
        
        if not query:
            return jsonify({'error': 'Query parameter q is required'}), 400
        
        emails = gmail_client.search_emails(query=query, max_results=max_results)
        return jsonify({
            'success': True,
            'count': len(emails),
            'query': query,
            'emails': emails
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/emails/<email_id>/read', methods=['POST'])
@require_gmail
def mark_read(email_id):
    success = gmail_client.mark_as_read(email_id)
    return jsonify({'success': success, 'email_id': email_id})


@app.route('/api/emails/<email_id>/archive', methods=['POST'])
@require_gmail
def archive_email(email_id):
    success = gmail_client.archive_email(email_id)
    return jsonify({'success': success, 'email_id': email_id})


@app.route('/api/emails/<email_id>/label', methods=['POST'])
@require_gmail
def label_email(email_id):
    data = request.get_json()
    label = data.get('label')
    if not label:
        return jsonify({'error': 'label field required'}), 400
    success = gmail_client.add_label(email_id, label)
    return jsonify({'success': success, 'email_id': email_id, 'label': label})


@app.route('/api/emails/send', methods=['POST'])
@require_gmail
def send_email():
    data = request.get_json()
    required = ['to', 'subject', 'body']
    if not all(k in data for k in required):
        return jsonify({'error': f'Required fields: {required}'}), 400
    
    result = gmail_client.send_email(
        to=data['to'],
        subject=data['subject'],
        body=data['body']
    )
    
    if result:
        return jsonify({'success': True, 'message_id': result.get('id')})
    return jsonify({'error': 'Failed to send email'}), 500


@app.route('/api/emails/reply', methods=['POST'])
@require_gmail
def send_reply():
    data = request.get_json()
    required = ['message_id', 'thread_id', 'to', 'subject', 'body']
    if not all(k in data for k in required):
        return jsonify({'error': f'Required fields: {required}'}), 400
    
    result = gmail_client.send_reply(
        original_message_id=data['message_id'],
        thread_id=data['thread_id'],
        to=data['to'],
        subject=data['subject'],
        body=data['body']
    )
    
    if result:
        return jsonify({'success': True, 'message_id': result.get('id')})
    return jsonify({'error': 'Failed to send reply'}), 500


# ---- AI Processing ----
@app.route('/api/ai/analyze', methods=['POST'])
@require_processor
def analyze_email():
    data = request.get_json()
    if not data or 'email' not in data:
        return jsonify({'error': 'email object required'}), 400
    
    try:
        use_ai = data.get('use_ai', True)
        analysis = processor.process_email(data['email'], use_ai=use_ai)
        return jsonify({
            'success': True,
            'analysis': analysis.to_dict()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ai/analyze/batch', methods=['POST'])
@require_processor
def analyze_batch():
    data = request.get_json()
    if not data or 'emails' not in data:
        return jsonify({'error': 'emails array required'}), 400
    
    try:
        analyses = processor.process_batch(data['emails'])
        stats = processor.get_inbox_statistics(analyses)
        return jsonify({
            'success': True,
            'count': len(analyses),
            'analyses': [a.to_dict() for a in analyses],
            'statistics': stats
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ai/summarize', methods=['POST'])
@require_processor
def summarize_email():
    data = request.get_json()
    if not data or 'email' not in data:
        return jsonify({'error': 'email object required'}), 400
    
    try:
        summary, key_points = processor.rule_ai.summarize(data['email'])
        return jsonify({
            'success': True,
            'summary': summary,
            'key_points': key_points
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ai/draft-reply', methods=['POST'])
@require_processor
def draft_reply():
    data = request.get_json()
    if not data or 'email' not in data:
        return jsonify({'error': 'email object required'}), 400
    
    tone = data.get('tone', 'professional')
    
    try:
        reply = processor.generate_auto_reply(data['email'], tone=tone)
        return jsonify({
            'success': True,
            'reply': reply,
            'tone': tone
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ai/auto-reply', methods=['POST'])
@require_processor
@require_gmail
def auto_reply():
    data = request.get_json()
    if not data or 'email' not in data:
        return jsonify({'error': 'email object required'}), 400
    
    email = data['email']
    tone = data.get('tone', 'professional')
    
    try:
        # Generate reply
        reply_text = processor.generate_auto_reply(email, tone=tone)
        
        # Send via Gmail
        result = gmail_client.send_reply(
            original_message_id=email.get('id', ''),
            thread_id=email.get('thread_id', ''),
            to=email.get('from', ''),
            subject=email.get('subject', ''),
            body=reply_text
        )
        
        if result:
            # Mark original as read
            gmail_client.mark_as_read(email.get('id', ''))
            
            return jsonify({
                'success': True,
                'message': 'Auto-reply sent',
                'reply_text': reply_text,
                'message_id': result.get('id')
            })
        
        return jsonify({'error': 'Failed to send auto-reply'}), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ai/importance', methods=['POST'])
@require_processor
def detect_importance():
    data = request.get_json()
    if not data or 'email' not in data:
        return jsonify({'error': 'email object required'}), 400
    
    importance, score, reason = processor.rule_ai.analyze_importance(data['email'])
    return jsonify({
        'success': True,
        'importance': importance.value,
        'score': score,
        'reason': reason
    })


@app.route('/api/ai/categorize', methods=['POST'])
@require_processor
def categorize_email():
    data = request.get_json()
    if not data or 'email' not in data:
        return jsonify({'error': 'email object required'}), 400
    
    category, confidence = processor.rule_ai.categorize(data['email'])
    return jsonify({
        'success': True,
        'category': category.value,
        'confidence': confidence
    })


@app.route('/api/ai/improve', methods=['POST'])
@require_processor
def improve_email():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': 'text field required'}), 400
    
    try:
        improved = processor.improve_draft(data['text'])
        return jsonify({'success': True, 'improved_text': improved})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ai/generate', methods=['POST'])
@require_processor
def generate_email():
    data = request.get_json()
    if not data or 'context' not in data:
        return jsonify({'error': 'context field required'}), 400
    
    tone = data.get('tone', 'professional')
    
    try:
        if processor.openai_processor:
            generated = processor.openai_processor.generate_email(data['context'], tone)
        else:
            generated = processor.rule_ai.generate_reply(
                {'from': data.get('to', ''), 'subject': data.get('subject', data['context']), 'body': ''},
                processor.default_tone
            )
        return jsonify({'success': True, 'email_text': generated})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ---- Settings ----
@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'GET':
        return jsonify({
            'openai_key_set': bool(os.getenv('OPENAI_API_KEY')),
            'gmail_connected': gmail_client is not None,
            'default_tone': os.getenv('DEFAULT_REPLY_TONE', 'professional'),
            'ai_provider': 'openai' if (processor and processor.openai_processor) else 'rule-based'
        })
    
    data = request.get_json()
    
    if 'openai_key' in data and data['openai_key']:
        os.environ['OPENAI_API_KEY'] = data['openai_key']
        init_processor()
        return jsonify({'success': True, 'message': 'OpenAI key updated'})
    
    return jsonify({'success': True})


# ---- Webhook for Gmail Push Notifications ----
@app.route('/api/webhook/gmail', methods=['POST'])
def gmail_webhook():
    try:
        envelope = request.get_json()
        if envelope and 'message' in envelope:
            data = envelope['message'].get('data', '')
            if data and gmail_client:
                from gmail_api import GmailWebhook
                webhook = GmailWebhook(gmail_client, '')
                new_messages = webhook.process_notification(data.encode())
                
                if new_messages and processor:
                    analyses = processor.process_batch(new_messages)
                    logger.info(f"Processed {len(analyses)} new emails from webhook")
        
        return '', 204
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return '', 500


if __name__ == '__main__':
    init_processor()
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    print(f"\n{'='*50}")
    print(f"  AI Email Automation System")
    print(f"  Server starting on http://localhost:{port}")
    print(f"  AI Provider: {'OpenAI GPT-4' if os.getenv('OPENAI_API_KEY') else 'Rule-based (fallback)'}")
    print(f"{'='*50}\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
