"""
AI Email Processor - Core AI Engine
Handles summarization, importance detection, auto-reply, and categorization
Uses OpenAI GPT-4 for advanced AI features with rule-based fallback
"""

import os
import re
import json
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("OpenAI not installed. Using rule-based AI fallback.")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Importance(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Category(Enum):
    WORK = "work"
    PERSONAL = "personal"
    NEWSLETTER = "newsletter"
    FINANCE = "finance"
    SOCIAL = "social"
    SPAM = "spam"
    OTHER = "other"


class ReplyTone(Enum):
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    FORMAL = "formal"
    CONCISE = "concise"


@dataclass
class EmailAnalysis:
    email_id: str
    summary: str = ""
    key_points: List[str] = field(default_factory=list)
    importance: Importance = Importance.LOW
    importance_score: float = 0.0
    importance_reason: str = ""
    category: Category = Category.OTHER
    category_confidence: float = 0.0
    draft_reply: str = ""
    suggested_actions: List[str] = field(default_factory=list)
    sentiment: str = "neutral"
    requires_response: bool = False
    processing_time: float = 0.0
    ai_provider: str = "rule-based"
    processed_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        return {
            'email_id': self.email_id,
            'summary': self.summary,
            'key_points': self.key_points,
            'importance': self.importance.value,
            'importance_score': self.importance_score,
            'importance_reason': self.importance_reason,
            'category': self.category.value,
            'category_confidence': self.category_confidence,
            'draft_reply': self.draft_reply,
            'suggested_actions': self.suggested_actions,
            'sentiment': self.sentiment,
            'requires_response': self.requires_response,
            'ai_provider': self.ai_provider,
            'processed_at': self.processed_at.isoformat()
        }


class RuleBasedAI:
    """Lightweight rule-based AI fallback when OpenAI is unavailable."""
    
    HIGH_IMPORTANCE_SIGNALS = [
        'urgent', 'asap', 'immediately', 'action required', 'deadline',
        'critical', 'important', 'approval needed', 'response required',
        'time sensitive', 'expires today', 'final notice', 'follow up required'
    ]
    
    MEDIUM_IMPORTANCE_SIGNALS = [
        'meeting', 'schedule', 'review', 'update', 'confirm', 'request',
        'question', 'inquiry', 'regarding', 'concerning', 'please respond'
    ]
    
    LOW_IMPORTANCE_SIGNALS = [
        'newsletter', 'unsubscribe', 'weekly digest', 'deals', 'offer',
        'sale', 'promotion', 'no-reply', 'automated', 'notification'
    ]
    
    CATEGORY_RULES = {
        Category.WORK: ['project', 'meeting', 'deadline', 'client', 'budget', 
                        'report', 'colleague', 'team', 'office', 'hr@', 'work'],
        Category.FINANCE: ['invoice', 'payment', 'billing', 'bank', 'receipt',
                           'transaction', 'stripe', 'paypal', 'subscription', 'refund'],
        Category.SOCIAL: ['linkedin', 'twitter', 'facebook', 'instagram', 
                          'connection', 'follower', 'friend request'],
        Category.NEWSLETTER: ['newsletter', 'unsubscribe', 'weekly', 'digest',
                              'subscription update', 'read more'],
        Category.PERSONAL: ['family', 'mom', 'dad', 'friend', 'birthday',
                            'personal', 'vacation', 'holiday'],
        Category.SPAM: ['winner', 'lottery', 'prize', 'free money', 'click here',
                        'limited time offer', 'act now', 'guaranteed']
    }
    
    REPLY_TEMPLATES = {
        ReplyTone.PROFESSIONAL: {
            'greeting': 'Dear {name},',
            'ack': 'Thank you for your email regarding "{subject}". I have received your message and will review it promptly.',
            'response_time': 'I will provide a detailed response within 24-48 business hours.',
            'closing': 'Best regards,'
        },
        ReplyTone.FRIENDLY: {
            'greeting': 'Hi {name}!',
            'ack': 'Thanks for reaching out about "{subject}"! Got your message.',
            'response_time': "I'll get back to you soon.",
            'closing': 'Cheers,'
        },
        ReplyTone.FORMAL: {
            'greeting': 'Dear Mr./Ms. {last_name},',
            'ack': 'I acknowledge receipt of your communication dated {date} concerning "{subject}".',
            'response_time': 'Please allow 2-3 business days for a comprehensive response.',
            'closing': 'Yours sincerely,'
        },
        ReplyTone.CONCISE: {
            'greeting': 'Hi {name},',
            'ack': 'Received. Will review and respond.',
            'response_time': 'Response incoming.',
            'closing': 'Thanks,'
        }
    }
    
    def analyze_importance(self, email: Dict) -> Tuple[Importance, float, str]:
        subject = email.get('subject', '').lower()
        body = email.get('body', '').lower()
        sender = email.get('from', '').lower()
        combined = f"{subject} {body} {sender}"
        
        high_matches = [s for s in self.HIGH_IMPORTANCE_SIGNALS if s in combined]
        medium_matches = [s for s in self.MEDIUM_IMPORTANCE_SIGNALS if s in combined]
        low_matches = [s for s in self.LOW_IMPORTANCE_SIGNALS if s in combined]
        
        # Check for authority senders
        authority_senders = ['hr@', 'ceo@', 'cto@', 'manager', 'director', 'boss', 'billing@']
        authority_match = any(a in sender for a in authority_senders)
        
        if len(high_matches) >= 2 or (len(high_matches) >= 1 and authority_match):
            score = min(0.95, 0.7 + len(high_matches) * 0.08 + (0.1 if authority_match else 0))
            reason = f"High priority signals detected: {', '.join(high_matches[:3])}"
            return Importance.HIGH, score, reason
        
        elif len(low_matches) >= 2 and not high_matches:
            score = max(0.1, 0.35 - len(low_matches) * 0.05)
            reason = f"Low priority indicators: {', '.join(low_matches[:3])}"
            return Importance.LOW, score, reason
        
        elif medium_matches or high_matches or authority_match:
            score = min(0.65, 0.4 + len(medium_matches) * 0.07 + (0.1 if authority_match else 0))
            reason = f"Medium priority signals: {', '.join((medium_matches + high_matches)[:3])}"
            return Importance.MEDIUM, score, reason
        
        else:
            return Importance.LOW, 0.2, "No specific importance signals detected."
    
    def categorize(self, email: Dict) -> Tuple[Category, float]:
        subject = email.get('subject', '').lower()
        body = email.get('body', '').lower()
        sender = email.get('from', '').lower()
        combined = f"{subject} {body} {sender}"
        
        scores = {}
        for category, keywords in self.CATEGORY_RULES.items():
            score = sum(1 for kw in keywords if kw in combined)
            if score > 0:
                scores[category] = score
        
        if not scores:
            return Category.OTHER, 0.3
        
        best = max(scores, key=scores.get)
        confidence = min(0.95, 0.5 + scores[best] * 0.1)
        return best, confidence
    
    def summarize(self, email: Dict) -> Tuple[str, List[str]]:
        subject = email.get('subject', '')
        sender_name = email.get('from', '').split('<')[0].strip() or email.get('from', '')
        body = email.get('body', '')
        
        # Extract key sentences
        sentences = [s.strip() for s in re.split(r'[.!?]', body) if len(s.strip()) > 30]
        key_points = [f"• {s}." for s in sentences[:3]]
        
        word_count = len(body.split())
        read_time = max(1, round(word_count / 200))
        
        summary = (
            f"Email from {sender_name} regarding '{subject}'. "
            f"Contains {word_count} words (~{read_time} min read). "
            f"{sentences[0][:120] + '...' if sentences and len(sentences[0]) > 120 else (sentences[0] if sentences else 'See full email for details')}."
        )
        
        return summary, key_points if key_points else ["• Review the full email for details."]
    
    def generate_reply(self, email: Dict, tone: ReplyTone = ReplyTone.PROFESSIONAL) -> str:
        template = self.REPLY_TEMPLATES.get(tone, self.REPLY_TEMPLATES[ReplyTone.PROFESSIONAL])
        
        sender_full = email.get('from', 'Sender')
        sender_name = re.sub(r'<.*?>', '', sender_full).strip()
        name_parts = sender_name.split()
        first_name = name_parts[0] if name_parts else 'There'
        last_name = name_parts[-1] if len(name_parts) > 1 else sender_name
        subject = email.get('subject', '')
        date = email.get('date', datetime.now().strftime('%B %d, %Y'))
        
        greeting = template['greeting'].format(
            name=first_name, last_name=last_name
        )
        ack = template['ack'].format(subject=subject, date=date)
        
        # Context-specific content
        body_lower = email.get('body', '').lower()
        specific = ''
        
        if any(w in body_lower for w in ['meeting', 'call', 'schedule', 'available', 'slot']):
            specific = "\n\nRegarding your scheduling request, I will check my calendar and propose available time slots shortly."
        elif any(w in body_lower for w in ['approve', 'approval', 'sign off', 'authorize']):
            specific = "\n\nI will review the materials and provide my decision after thorough evaluation."
        elif any(w in body_lower for w in ['question', 'help', 'assist', 'support', 'how']):
            specific = "\n\nI would be happy to assist with your inquiry and provide the necessary information."
        elif any(w in body_lower for w in ['attach', 'document', 'file', 'report']):
            specific = "\n\nI have received the attachments and will review them carefully."
        elif any(w in body_lower for w in ['deadline', 'urgent', 'asap', 'immediately']):
            specific = "\n\nI understand the urgency and will prioritize this matter accordingly."
        
        reply = f"{greeting}\n\n{ack}{specific}\n\n{template['response_time']}\n\n{template['closing']}\nYour Name"
        return reply
    
    def detect_sentiment(self, body: str) -> str:
        body_lower = body.lower()
        
        positive_words = ['thank', 'appreciate', 'great', 'excellent', 'pleased', 'happy', 'wonderful', 'perfect']
        negative_words = ['disappointed', 'frustrated', 'upset', 'angry', 'terrible', 'poor', 'unacceptable', 'complaint']
        urgent_words = ['urgent', 'asap', 'immediately', 'critical', 'deadline']
        
        pos_score = sum(1 for w in positive_words if w in body_lower)
        neg_score = sum(1 for w in negative_words if w in body_lower)
        urgent_score = sum(1 for w in urgent_words if w in body_lower)
        
        if urgent_score >= 2:
            return "urgent"
        elif neg_score > pos_score:
            return "negative"
        elif pos_score > neg_score:
            return "positive"
        else:
            return "neutral"
    
    def requires_response(self, email: Dict) -> bool:
        subject = email.get('subject', '').lower()
        body = email.get('body', '').lower()
        sender = email.get('from', '').lower()
        
        # No-reply senders don't need response
        if 'noreply' in sender or 'no-reply' in sender or 'newsletter' in sender:
            return False
        
        # Question marks and action requests indicate response needed
        response_indicators = ['?', 'please respond', 'let me know', 'confirm', 'your thoughts',
                               'available', 'can you', 'could you', 'would you', 'please advise']
        
        return any(ind in body or ind in subject for ind in response_indicators)
    
    def suggest_actions(self, email: Dict, importance: Importance, requires_response: bool) -> List[str]:
        actions = []
        subject = email.get('subject', '').lower()
        body = email.get('body', '').lower()
        
        if requires_response:
            actions.append("Reply to sender")
        
        if importance == Importance.HIGH:
            actions.append("Mark as important")
            actions.append("Flag for follow-up")
        
        if any(w in body for w in ['attached', 'attachment', 'document', 'file']):
            actions.append("Review attachments")
        
        if any(w in body for w in ['meeting', 'call', 'schedule']):
            actions.append("Add to calendar")
        
        if any(w in body for w in ['deadline', 'due date', 'by end of']):
            actions.append("Set deadline reminder")
        
        if any(w in subject or w in body for w in ['invoice', 'payment', 'billing']):
            actions.append("Process payment/invoice")
        
        if not actions:
            actions.append("Archive after reading")
        
        return actions[:5]


class OpenAIProcessor:
    """OpenAI-powered email processor using GPT-4."""
    
    def __init__(self, api_key: str, model: str = "gpt-4-turbo-preview"):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model
    
    def analyze_email(self, email: Dict, tone: str = "professional") -> Dict:
        prompt = f"""Analyze this email and provide a structured JSON response:

Subject: {email.get('subject', '')}
From: {email.get('from', '')}
Body: {email.get('body', '')[:2000]}

Respond with valid JSON containing:
{{
  "summary": "2-3 sentence summary",
  "key_points": ["point 1", "point 2", "point 3"],
  "importance": "high|medium|low",
  "importance_score": 0.0-1.0,
  "importance_reason": "explanation",
  "category": "work|personal|newsletter|finance|social|spam|other",
  "category_confidence": 0.0-1.0,
  "sentiment": "positive|negative|neutral|urgent",
  "requires_response": true/false,
  "suggested_actions": ["action 1", "action 2"],
  "draft_reply": "Full email reply draft in {tone} tone"
}}"""
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500
        )
        
        content = response.choices[0].message.content
        # Extract JSON
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return {}
    
    def improve_email(self, email_text: str, instructions: str = "Improve clarity and professionalism") -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{
                "role": "user",
                "content": f"Improve this email. {instructions}:\n\n{email_text}\n\nReturn only the improved email."
            }],
            temperature=0.5,
            max_tokens=800
        )
        return response.choices[0].message.content
    
    def generate_email(self, context: str, tone: str = "professional") -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{
                "role": "user",
                "content": f"Write a {tone} email for this context: {context}\n\nReturn only the email."
            }],
            temperature=0.6,
            max_tokens=600
        )
        return response.choices[0].message.content


class EmailProcessor:
    """Main email processing pipeline combining rule-based and AI processing."""
    
    def __init__(self, openai_key: Optional[str] = None, default_tone: str = "professional"):
        self.rule_ai = RuleBasedAI()
        self.openai_processor = None
        self.default_tone = ReplyTone(default_tone)
        
        if openai_key and OPENAI_AVAILABLE:
            try:
                self.openai_processor = OpenAIProcessor(api_key=openai_key)
                logger.info("OpenAI processor initialized")
            except Exception as e:
                logger.warning(f"Failed to init OpenAI: {e}. Using rule-based fallback.")
    
    def process_email(self, email: Dict, use_ai: bool = True) -> EmailAnalysis:
        """Process a single email through the full AI pipeline."""
        import time
        start = time.time()
        
        analysis = EmailAnalysis(email_id=email.get('id', 'unknown'))
        
        try:
            if use_ai and self.openai_processor:
                # Use OpenAI for full analysis
                result = self.openai_processor.analyze_email(email, self.default_tone.value)
                
                analysis.summary = result.get('summary', '')
                analysis.key_points = result.get('key_points', [])
                analysis.importance = Importance(result.get('importance', 'low'))
                analysis.importance_score = result.get('importance_score', 0.5)
                analysis.importance_reason = result.get('importance_reason', '')
                analysis.category = Category(result.get('category', 'other'))
                analysis.category_confidence = result.get('category_confidence', 0.5)
                analysis.sentiment = result.get('sentiment', 'neutral')
                analysis.requires_response = result.get('requires_response', False)
                analysis.suggested_actions = result.get('suggested_actions', [])
                analysis.draft_reply = result.get('draft_reply', '')
                analysis.ai_provider = "openai-gpt4"
                
            else:
                # Rule-based processing
                importance, score, reason = self.rule_ai.analyze_importance(email)
                analysis.importance = importance
                analysis.importance_score = score
                analysis.importance_reason = reason
                
                category, confidence = self.rule_ai.categorize(email)
                analysis.category = category
                analysis.category_confidence = confidence
                
                summary, key_points = self.rule_ai.summarize(email)
                analysis.summary = summary
                analysis.key_points = key_points
                
                analysis.sentiment = self.rule_ai.detect_sentiment(email.get('body', ''))
                analysis.requires_response = self.rule_ai.requires_response(email)
                analysis.draft_reply = self.rule_ai.generate_reply(email, self.default_tone)
                analysis.suggested_actions = self.rule_ai.suggest_actions(
                    email, importance, analysis.requires_response
                )
                analysis.ai_provider = "rule-based"
        
        except Exception as e:
            logger.error(f"Error processing email {email.get('id', '?')}: {e}")
            analysis.summary = "Error during processing. Please review manually."
            analysis.suggested_actions = ["Manual review required"]
        
        analysis.processing_time = round(time.time() - start, 3)
        return analysis
    
    def process_batch(self, emails: List[Dict], max_concurrent: int = 5) -> List[EmailAnalysis]:
        """Process multiple emails in batch."""
        results = []
        for i, email in enumerate(emails):
            logger.info(f"Processing email {i+1}/{len(emails)}: {email.get('subject', '?')[:50]}")
            result = self.process_email(email)
            results.append(result)
        return results
    
    def generate_auto_reply(self, email: Dict, tone: Optional[str] = None) -> str:
        """Generate an auto-reply for an email."""
        reply_tone = ReplyTone(tone) if tone else self.default_tone
        
        if self.openai_processor:
            try:
                context = f"Reply to this email in {reply_tone.value} tone:\n{json.dumps(email)}"
                return self.openai_processor.generate_email(context, reply_tone.value)
            except Exception:
                pass
        
        return self.rule_ai.generate_reply(email, reply_tone)
    
    def improve_draft(self, draft_text: str) -> str:
        """Improve an email draft using AI."""
        if self.openai_processor:
            try:
                return self.openai_processor.improve_email(draft_text)
            except Exception:
                pass
        
        # Rule-based improvement
        improved = draft_text
        replacements = [
            (r'\bi think\b', 'I believe'),
            (r'\bgot\b', 'received'),
            (r'\bgonna\b', 'going to'),
            (r'\bwanna\b', 'want to'),
            (r'\bkinda\b', 'somewhat'),
            (r'\bstuff\b', 'matters'),
        ]
        for pattern, replacement in replacements:
            improved = re.sub(pattern, replacement, improved, flags=re.IGNORECASE)
        return improved
    
    def get_inbox_statistics(self, analyses: List[EmailAnalysis]) -> Dict:
        """Generate statistics from a batch of email analyses."""
        if not analyses:
            return {}
        
        total = len(analyses)
        by_importance = {imp.value: sum(1 for a in analyses if a.importance == imp) for imp in Importance}
        by_category = {cat.value: sum(1 for a in analyses if a.category == cat) for cat in Category}
        
        return {
            'total': total,
            'by_importance': by_importance,
            'by_category': by_category,
            'require_response': sum(1 for a in analyses if a.requires_response),
            'avg_processing_time': round(sum(a.processing_time for a in analyses) / total, 3),
            'ai_provider': analyses[0].ai_provider if analyses else 'unknown'
        }


if __name__ == "__main__":
    # Example usage
    processor = EmailProcessor(
        openai_key=os.getenv('OPENAI_API_KEY'),
        default_tone="professional"
    )
    
    test_email = {
        'id': 'test001',
        'from': 'manager@company.com',
        'subject': 'URGENT: Q4 Budget Approval Needed by EOD',
        'body': '''Hi,
        
I hope you are well. I am writing urgently regarding the Q4 budget approval. 
We need your sign-off by end of day today to proceed with vendor payments.
The total is $245,000. Please review and approve ASAP.

Best,
Manager''',
        'date': '2026-03-06'
    }
    
    result = processor.process_email(test_email)
    print(json.dumps(result.to_dict(), indent=2))
