// ================================================
// AI Email Automation System - Main Application
// ================================================

// ---- STATE MANAGEMENT ----
const AppState = {
  emails: [],
  drafts: [],
  sentEmails: [],
  selectedEmails: new Set(),
  currentView: 'inbox',
  currentEmail: null,
  settings: {
    autoReply: true,
    autoSummarize: true,
    importanceDetection: true,
    autoCategories: true,
    openaiKey: '',
    gmailConnected: false,
    replyTone: 'professional',
    autoReplyThreshold: 'low',
    notificationsEnabled: true,
    darkMode: true
  },
  stats: {
    totalProcessed: 0,
    autoReplied: 0,
    summarized: 0,
    categorized: 0,
    importantDetected: 0
  }
};

// ---- MOCK EMAIL DATA ----
const MOCK_EMAILS = [
  {
    id: 'e001', from: 'sarah.chen@techcorp.com', fromName: 'Sarah Chen',
    to: 'user@gmail.com', subject: 'Q4 Budget Approval - URGENT ACTION REQUIRED',
    body: `Hi,\n\nI hope this email finds you well. I am writing to urgently request your approval for the Q4 budget allocation. We need your sign-off by end of day today to proceed with the vendor payments scheduled for tomorrow morning.\n\nThe total budget requested is $245,000 which breaks down as follows:\n- Infrastructure: $120,000\n- Personnel: $85,000\n- Marketing: $40,000\n\nPlease review the attached breakdown and confirm your approval at your earliest convenience.\n\nBest regards,\nSarah Chen\nFinance Manager`,
    date: new Date(Date.now() - 1000*60*30), category: 'work', importance: 'high',
    read: false, hasAttachment: true, tags: ['work', 'finance', 'urgent']
  },
  {
    id: 'e002', from: 'newsletter@techweekly.io', fromName: 'Tech Weekly',
    to: 'user@gmail.com', subject: 'This Week in AI: GPT-5, New Models & More',
    body: `Welcome to this week's edition of Tech Weekly!\n\nTop Stories:\n1. New AI models released with unprecedented capabilities\n2. Major tech companies announce AI partnerships\n3. Open source LLM breaks performance records\n\nRead more at our website. To unsubscribe, click here.`,
    date: new Date(Date.now() - 1000*60*60*2), category: 'newsletter', importance: 'low',
    read: true, hasAttachment: false, tags: ['newsletter']
  },
  {
    id: 'e003', from: 'mike.johnson@client.com', fromName: 'Mike Johnson',
    to: 'user@gmail.com', subject: 'Project Deadline Extension Request',
    body: `Dear Team,\n\nI wanted to reach out regarding our project timeline. Due to some unexpected complications with the API integration, we are requesting a 2-week extension on the delivery date.\n\nWe understand this may impact your schedule and we sincerely apologize for any inconvenience. Our team has been working around the clock to resolve the issues.\n\nWould you be available for a quick call tomorrow at 2 PM EST to discuss this further?\n\nBest,\nMike Johnson`,
    date: new Date(Date.now() - 1000*60*60*5), category: 'work', importance: 'high',
    read: false, hasAttachment: false, tags: ['work', 'important']
  },
  {
    id: 'e004', from: 'mom@family.com', fromName: 'Mom',
    to: 'user@gmail.com', subject: 'Family reunion next month!',
    body: `Hi sweetheart!\n\nJust wanted to remind you about the family reunion next month on the 15th. Aunt Martha is flying in from Seattle and Grandpa Joe will also be there!\n\nPlease let me know if you can make it. We're planning a big BBQ and would love to have everyone together.\n\nLove,\nMom`,
    date: new Date(Date.now() - 1000*60*60*8), category: 'personal', importance: 'medium',
    read: false, hasAttachment: false, tags: ['personal']
  },
  {
    id: 'e005', from: 'hr@company.com', fromName: 'HR Department',
    to: 'user@gmail.com', subject: 'Performance Review Scheduled - Please Confirm',
    body: `Dear Employee,\n\nYour annual performance review has been scheduled for next Tuesday at 10:00 AM in Conference Room B.\n\nPlease bring:\n- Self-assessment form (attached)\n- List of achievements for the year\n- Goals for next year\n\nPlease confirm your attendance by replying to this email.\n\nRegards,\nHR Department`,
    date: new Date(Date.now() - 1000*60*60*12), category: 'work', importance: 'high',
    read: false, hasAttachment: true, tags: ['work', 'hr', 'important']
  },
  {
    id: 'e006', from: 'deals@amazon.com', fromName: 'Amazon',
    to: 'user@gmail.com', subject: '🛍️ Your Amazon order has shipped!',
    body: `Great news! Your order #123-456789 has shipped.\n\nOrder details:\n- Wireless Headphones x1\nEstimated delivery: Tomorrow by 8 PM\n\nTrack your package here.`,
    date: new Date(Date.now() - 1000*60*60*18), category: 'newsletter', importance: 'low',
    read: true, hasAttachment: false, tags: ['newsletter', 'shopping']
  },
  {
    id: 'e007', from: 'david.smith@partner.co', fromName: 'David Smith',
    to: 'user@gmail.com', subject: 'Partnership Opportunity - Confidential',
    body: `Hello,\n\nI represent a Fortune 500 company looking to establish strategic partnerships in your industry. After reviewing your company's profile, we believe there could be significant synergies between our organizations.\n\nI would love to schedule a 30-minute call to discuss potential collaboration opportunities that could be mutually beneficial.\n\nAre you available this week for a brief introductory call?\n\nBest regards,\nDavid Smith\nBusiness Development Director`,
    date: new Date(Date.now() - 1000*60*60*24), category: 'work', importance: 'medium',
    read: false, hasAttachment: false, tags: ['work']
  },
  {
    id: 'e008', from: 'noreply@github.com', fromName: 'GitHub',
    to: 'user@gmail.com', subject: '[GitHub] A pull request has been merged',
    body: `Your pull request "Feature: AI Email Integration" has been merged into main.\n\nRepository: ai-email-automation\nPR #47 merged by: john_dev\n\nView the merged commit on GitHub.`,
    date: new Date(Date.now() - 1000*60*60*28), category: 'work', importance: 'medium',
    read: true, hasAttachment: false, tags: ['work', 'dev']
  },
  {
    id: 'e009', from: 'billing@stripe.com', fromName: 'Stripe',
    to: 'user@gmail.com', subject: 'Invoice #INV-2024-001 - Payment Successful',
    body: `Your payment has been processed successfully.\n\nInvoice #INV-2024-001\nAmount: $299.00\nPlan: Pro Monthly\nDate: March 1, 2025\n\nThank you for your continued subscription!`,
    date: new Date(Date.now() - 1000*60*60*36), category: 'finance', importance: 'medium',
    read: true, hasAttachment: false, tags: ['finance']
  },
  {
    id: 'e010', from: 'linkedin@linkedin.com', fromName: 'LinkedIn',
    to: 'user@gmail.com', subject: 'You have 5 new connection requests',
    body: `You have 5 new connection requests waiting for you on LinkedIn.\n\nConnect with:\n• Jane Doe - Software Engineer at Google\n• Bob Wilson - CTO at StartupXYZ\n• Alice Brown - Product Manager\n• Charlie Davis - DevOps Lead\n• Emma Jones - Data Scientist\n\nView and respond to your requests.`,
    date: new Date(Date.now() - 1000*60*60*48), category: 'social', importance: 'low',
    read: true, hasAttachment: false, tags: ['social']
  }
];

// ---- AI ENGINE ----
const AIEngine = {
  // Simulate AI processing delay
  async process(task, duration = 1200) {
    showAIOverlay(task);
    await sleep(duration);
    hideAIOverlay();
  },

  // Summarize email
  summarize(email) {
    const words = email.body.split(' ');
    const sentences = email.body.split('.').filter(s => s.trim().length > 20);
    const keyPoints = sentences.slice(0, 2).map(s => '• ' + s.trim() + '.');
    
    const urgencyWords = ['urgent', 'asap', 'immediately', 'deadline', 'today', 'now'];
    const isUrgent = urgencyWords.some(w => email.body.toLowerCase().includes(w));
    
    return {
      summary: `This email from ${email.fromName} is regarding "${email.subject}". ` +
               `${sentences[0]?.trim() || 'See full email for details'}.`,
      keyPoints: keyPoints.length ? keyPoints : ['• Email requires your attention.'],
      wordCount: words.length,
      readTime: Math.ceil(words.length / 200),
      urgency: isUrgent ? 'HIGH' : (email.importance === 'high' ? 'MEDIUM' : 'NORMAL')
    };
  },

  // Detect importance
  detectImportance(email) {
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();
    const combined = subject + ' ' + body;
    
    const highSignals = ['urgent', 'asap', 'immediately', 'deadline', 'critical', 
                         'action required', 'important', 'approval', 'expires'];
    const mediumSignals = ['meeting', 'schedule', 'review', 'update', 'request', 
                           'follow up', 'reminder', 'confirm'];
    const spamSignals = ['unsubscribe', 'newsletter', 'deal', 'offer', 'discount', 
                         'sale', 'limited time', 'click here', 'free'];
    
    const highScore = highSignals.filter(s => combined.includes(s)).length;
    const mediumScore = mediumSignals.filter(s => combined.includes(s)).length;
    const spamScore = spamSignals.filter(s => combined.includes(s)).length;
    
    const knownSenderBoost = ['hr@', 'billing@', 'manager', 'director', 'cto', 'ceo'].some(s => email.from.includes(s));
    
    let importance, score, reasoning;
    
    if (spamScore >= 2) {
      importance = 'low'; score = 15 + spamScore * 5;
      reasoning = 'Contains promotional/newsletter indicators.';
    } else if (highScore >= 2 || (highScore >= 1 && knownSenderBoost)) {
      importance = 'high'; score = 75 + highScore * 8;
      reasoning = `Detected ${highScore} high-priority signal(s): ${highSignals.filter(s => combined.includes(s)).join(', ')}.`;
    } else if (mediumScore >= 1 || highScore >= 1 || knownSenderBoost) {
      importance = 'medium'; score = 45 + mediumScore * 10;
      reasoning = `Detected ${mediumScore} medium-priority signal(s). Sender appears professional.`;
    } else {
      importance = 'low'; score = 20;
      reasoning = 'No specific importance signals detected.';
    }
    
    return { importance, score: Math.min(score, 99), reasoning };
  },

  // Generate auto-reply
  generateAutoReply(email) {
    const tone = AppState.settings.replyTone;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    
    const templates = {
      professional: {
        greeting: `Dear ${email.fromName},\n\n`,
        ack: `Thank you for reaching out. I have received your email regarding "${email.subject}" and will review it promptly.`,
        timeline: `\n\nI will get back to you with a detailed response within 24-48 business hours.`,
        closing: `\n\nBest regards,\nYour Name`
      },
      friendly: {
        greeting: `Hi ${email.fromName.split(' ')[0]}!\n\n`,
        ack: `Thanks for your email about "${email.subject}"! Got it and I'll take a look.`,
        timeline: `\n\nI'll get back to you soon - probably within a day or so.`,
        closing: `\n\nCheers,\nYour Name`
      },
      formal: {
        greeting: `Dear Mr./Ms. ${email.fromName.split(' ')[1] || email.fromName},\n\n`,
        ack: `I acknowledge receipt of your correspondence dated ${email.date.toLocaleDateString()} concerning "${email.subject}".`,
        timeline: `\n\nKindly allow 2-3 business days for a comprehensive response.`,
        closing: `\n\nYours sincerely,\nYour Name`
      }
    };
    
    const t = templates[tone] || templates.professional;
    
    // Subject-specific additions
    let specific = '';
    if (email.subject.toLowerCase().includes('meeting') || email.subject.toLowerCase().includes('schedule')) {
      specific = `\n\nRegarding the scheduling request, I will check my calendar and propose some available time slots.`;
    } else if (email.subject.toLowerCase().includes('approval') || email.subject.toLowerCase().includes('review')) {
      specific = `\n\nI will review the materials and provide my feedback/approval as soon as possible.`;
    } else if (email.subject.toLowerCase().includes('question') || email.subject.toLowerCase().includes('help')) {
      specific = `\n\nI would be happy to assist with your inquiry.`;
    }
    
    return t.greeting + t.ack + specific + t.timeline + t.closing;
  },

  // Categorize email
  categorize(email) {
    const combined = (email.subject + ' ' + email.from + ' ' + email.body).toLowerCase();
    
    const rules = [
      { category: 'work', keywords: ['project', 'meeting', 'deadline', 'report', 'team', 'manager', 'office', 'client', 'budget', 'review', 'hr@', 'employee'] },
      { category: 'finance', keywords: ['invoice', 'payment', 'billing', 'bank', 'transaction', 'receipt', 'subscription', 'stripe', 'paypal'] },
      { category: 'social', keywords: ['linkedin', 'twitter', 'facebook', 'instagram', 'connection', 'follow', 'friend'] },
      { category: 'newsletter', keywords: ['newsletter', 'unsubscribe', 'weekly', 'digest', 'subscription', 'update from'] },
      { category: 'personal', keywords: ['mom', 'dad', 'family', 'friend', 'hi sweetie', 'love you', 'birthday', 'reunion'] },
      { category: 'spam', keywords: ['click here', 'limited time', 'free offer', 'winner', 'lottery', 'prize', 'nigerian'] }
    ];
    
    const scores = {};
    rules.forEach(rule => {
      scores[rule.category] = rule.keywords.filter(k => combined.includes(k)).length;
    });
    
    const best = Object.entries(scores).sort(([,a],[,b]) => b-a)[0];
    return best[1] > 0 ? best[0] : 'other';
  },

  // Draft reply based on context
  draftReply(email) {
    const detection = this.detectImportance(email);
    const replyBase = this.generateAutoReply(email);
    
    // Add context-specific content
    let contextContent = '';
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();
    
    if (body.includes('available') || body.includes('call') || body.includes('meeting')) {
      contextContent = `\n\nRegarding your request for a meeting/call, I would suggest the following time slots:\n- Tuesday, 2:00 PM - 3:00 PM\n- Wednesday, 10:00 AM - 11:00 AM\n- Thursday, 3:00 PM - 4:00 PM\n\nPlease let me know which works best for you.`;
    } else if (body.includes('approve') || body.includes('confirm') || body.includes('sign')) {
      contextContent = `\n\nI have reviewed the details you provided. I will confirm my decision after a thorough review of all the relevant documentation.`;
    } else if (body.includes('attached') || body.includes('attachment')) {
      contextContent = `\n\nI have received the attachments and will review them carefully.`;
    }
    
    return replyBase.replace('Best regards,', contextContent + '\n\nBest regards,');
  },

  // Improve email with AI
  improveEmail(text) {
    if (!text.trim()) return '';
    
    // Simple improvements simulation
    let improved = text;
    improved = improved.replace(/\bi think\b/gi, 'I believe');
    improved = improved.replace(/\bgot\b/gi, 'received');
    improved = improved.replace(/\bget back\b/gi, 'respond');
    improved = improved.replace(/\bstuff\b/gi, 'items');
    improved = improved.replace(/\bdo asap\b/gi, 'address promptly');
    improved = improved.replace(/\bkinda\b/gi, 'somewhat');
    improved = improved.replace(/\bgonna\b/gi, 'going to');
    improved = improved.replace(/\bwanna\b/gi, 'want to');
    
    // Add professional closing if missing
    if (!improved.toLowerCase().includes('regards') && !improved.toLowerCase().includes('sincerely')) {
      improved += '\n\nBest regards,\nYour Name';
    }
    
    return improved;
  },

  // Generate email from prompt
  generateEmail(prompt, to, subject) {
    const templates = {
      'meeting': `Dear ${to || 'Recipient'},\n\nI hope this email finds you well. I am writing to request a meeting to discuss ${subject || 'the upcoming project'}. \n\nWould you be available for a 30-minute call sometime this week? I am flexible with timing and can accommodate your schedule.\n\nPlease let me know your availability, and I will send a calendar invite accordingly.\n\nBest regards,\nYour Name`,
      'follow-up': `Dear ${to || 'Recipient'},\n\nI am following up on my previous email regarding ${subject || 'our recent discussion'}. \n\nI wanted to check in and see if you had a chance to review the information I sent. Please let me know if you have any questions or need any additional details.\n\nI look forward to hearing from you.\n\nBest regards,\nYour Name`,
      'default': `Dear ${to || 'Recipient'},\n\nI am writing regarding ${subject || 'the matter at hand'}. \n\nAfter careful consideration, I believe it would be beneficial to discuss this further. Please review the details and let me know your thoughts.\n\nI look forward to your response.\n\nBest regards,\nYour Name`
    };
    
    const type = prompt.toLowerCase().includes('meeting') ? 'meeting' : 
                 prompt.toLowerCase().includes('follow') ? 'follow-up' : 'default';
    return templates[type];
  }
};

// ---- GMAIL API INTEGRATION ----
const GmailAPI = {
  CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID',
  SCOPES: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify',
  
  async connect() {
    showToast('🔗 Connecting to Gmail API...', 'ai');
    // In production: Load Google Identity Services and request OAuth2 token
    // window.google.accounts.oauth2.initTokenClient({...})
    await sleep(2000);
    AppState.settings.gmailConnected = true;
    updateSettings();
    showToast('✅ Gmail connected successfully! (Demo Mode)', 'success');
    renderSettingsPanel();
  },

  async fetchEmails() {
    if (!AppState.settings.gmailConnected) {
      showToast('⚠️ Connect Gmail first in Settings', 'error');
      return;
    }
    showToast('📬 Fetching emails from Gmail...', 'ai');
    await sleep(1800);
    // In production: GET https://gmail.googleapis.com/gmail/v1/users/me/messages
    showToast('✅ Gmail sync complete! 10 new emails', 'success');
  },

  async sendEmail(to, subject, body) {
    if (!AppState.settings.gmailConnected) {
      showToast('⚠️ Connect Gmail first in Settings', 'error');
      return false;
    }
    await sleep(1000);
    // In production: POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
    return true;
  },

  async markAsRead(emailId) {
    // In production: POST .../messages/{id}/modify with removeLabelIds: ['UNREAD']
    return true;
  },

  async archiveEmail(emailId) {
    // In production: POST .../messages/{id}/modify with removeLabelIds: ['INBOX']
    return true;
  },

  createRawEmail(to, subject, body) {
    const email = [`To: ${to}`, `Subject: ${subject}`, '', body].join('\n');
    return btoa(email).replace(/\+/g, '-').replace(/\//g, '_');
  }
};

// ---- UI RENDERING ----
function renderEmailList(emails, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!emails.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No emails found</h3>
        <p>Your filtered emails will appear here</p>
      </div>`;
    return;
  }

  container.innerHTML = emails.map(email => `
    <div class="email-item ${!email.read ? 'unread' : ''} ${email.importance === 'high' ? 'important-flag' : ''}" 
         id="email-${email.id}" onclick="openEmail('${email.id}')">
      <input type="checkbox" class="email-checkbox" onclick="event.stopPropagation(); toggleSelect('${email.id}')" 
             ${AppState.selectedEmails.has(email.id) ? 'checked' : ''}>
      <div>
        <div class="email-sender">
          ${!email.read ? '<span class="unread-dot"></span>' : ''}
          ${escHtml(email.fromName)}
          ${email.hasAttachment ? '<span title="Has attachment">📎</span>' : ''}
        </div>
        <div class="email-subject">${escHtml(email.subject)}</div>
        <div class="email-preview">${escHtml(email.body.substring(0, 120))}...</div>
      </div>
      <div class="email-meta">
        <span class="email-time">${formatTime(email.date)}</span>
        <div class="email-tags">
          ${email.tags.map(t => `<span class="tag tag-${t}">${t}</span>`).join('')}
          ${email.importance === 'high' ? '<span class="tag tag-important">⭐ High</span>' : ''}
        </div>
      </div>
    </div>`).join('');
}

function renderCategories() {
  const cats = {};
  AppState.emails.forEach(e => {
    cats[e.category] = (cats[e.category] || 0) + 1;
  });
  
  const icons = { work:'💼', personal:'👤', newsletter:'📰', finance:'💰', social:'🌐', spam:'🚫', other:'📁' };
  const colors = { work:'var(--accent-blue)', personal:'var(--accent-green)', newsletter:'var(--accent-yellow)', finance:'var(--accent-purple)', social:'var(--accent-orange)', spam:'var(--accent-red)', other:'var(--text-muted)' };
  
  document.getElementById('categories-grid').innerHTML = Object.entries(cats).map(([cat, count]) => `
    <div class="category-card" onclick="filterByCategory('${cat}')" style="border-color: ${colors[cat] || 'var(--border)'}">
      <div class="category-icon">${icons[cat] || '📁'}</div>
      <div class="category-name">${capitalize(cat)}</div>
      <div class="category-count">${count} email${count !== 1 ? 's' : ''}</div>
    </div>`).join('');
}

function renderAnalytics() {
  const total = AppState.emails.length;
  const unread = AppState.emails.filter(e => !e.read).length;
  const important = AppState.emails.filter(e => e.importance === 'high').length;
  
  const catCounts = {};
  AppState.emails.forEach(e => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayData = days.map(() => Math.floor(Math.random() * 15) + 2);
  const maxDay = Math.max(...dayData);
  
  const cats = Object.entries(catCounts);
  
  document.getElementById('analytics-grid').innerHTML = `
    <div class="analytics-card">
      <h3>📊 Overview</h3>
      <div class="analytics-value">${total}</div>
      <div class="analytics-label">Total Emails</div>
      <div class="analytics-bar"><div class="analytics-bar-fill" style="width:100%"></div></div>
    </div>
    <div class="analytics-card">
      <h3>📬 Unread</h3>
      <div class="analytics-value" style="color:var(--accent-orange)">${unread}</div>
      <div class="analytics-label">${Math.round(unread/total*100)}% of inbox unread</div>
      <div class="analytics-bar"><div class="analytics-bar-fill" style="width:${unread/total*100}%;background:var(--accent-orange)"></div></div>
    </div>
    <div class="analytics-card">
      <h3>⭐ Important</h3>
      <div class="analytics-value" style="color:var(--accent-yellow)">${important}</div>
      <div class="analytics-label">High priority emails</div>
      <div class="analytics-bar"><div class="analytics-bar-fill" style="width:${important/total*100}%;background:var(--accent-yellow)"></div></div>
    </div>
    <div class="analytics-card">
      <h3>🤖 AI Activity</h3>
      <div class="analytics-value" style="color:var(--accent-purple)">${AppState.stats.totalProcessed}</div>
      <div class="analytics-label">Emails AI-processed</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:8px">
        Auto-replied: ${AppState.stats.autoReplied} | Summarized: ${AppState.stats.summarized} | 
        Important detected: ${AppState.stats.importantDetected}
      </div>
    </div>
    <div class="analytics-card" style="grid-column: span 2;">
      <h3>📅 Email Volume (Last 7 Days)</h3>
      <div class="chart-container">
        ${days.map((d,i) => `
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="height:${Math.round(dayData[i]/maxDay*130)}px;background:${i===new Date().getDay()-1?'var(--accent-blue)':'var(--bg-hover)'}"></div>
            <span class="chart-label">${d}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="analytics-card">
      <h3>🗂️ By Category</h3>
      ${cats.map(([cat,cnt]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px">${capitalize(cat)}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="height:6px;width:${Math.round(cnt/total*80)}px;min-width:4px;background:var(--accent-blue);border-radius:3px"></div>
            <span style="font-size:12px;color:var(--text-muted)">${cnt}</span>
          </div>
        </div>`).join('')}
    </div>`;
}

function renderSettingsPanel() {
  const s = AppState.settings;
  document.getElementById('settings-panel').innerHTML = `
    <div class="gmail-connect-box">
      <div class="gmail-logo">📧</div>
      <h3>Gmail API Integration</h3>
      <p>Connect your Gmail account to enable real email processing, auto-replies, and inbox management.</p>
      ${s.gmailConnected ? 
        `<div style="color:var(--accent-green);font-weight:600;margin-bottom:12px">✅ Gmail Connected</div>
         <button class="btn btn-danger" onclick="GmailAPI.connect()">Reconnect Account</button>` :
        `<button class="btn btn-primary" onclick="GmailAPI.connect()">🔗 Connect Gmail Account</button>`
      }
    </div>
    
    <div class="settings-section">
      <h3>🤖 AI Configuration</h3>
      <div class="settings-row">
        <div>
          <div class="settings-label">OpenAI API Key</div>
          <div class="settings-description">Required for advanced AI features (GPT-4 powered)</div>
        </div>
        <input type="password" class="settings-input" placeholder="sk-..." value="${s.openaiKey}" 
               onchange="updateSetting('openaiKey', this.value)">
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Reply Tone</div>
          <div class="settings-description">Tone used for AI-generated replies</div>
        </div>
        <select class="filter-select" onchange="updateSetting('replyTone', this.value)">
          <option value="professional" ${s.replyTone==='professional'?'selected':''}>Professional</option>
          <option value="friendly" ${s.replyTone==='friendly'?'selected':''}>Friendly</option>
          <option value="formal" ${s.replyTone==='formal'?'selected':''}>Formal</option>
        </select>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Auto-Reply Threshold</div>
          <div class="settings-description">Importance level that triggers auto-reply</div>
        </div>
        <select class="filter-select" onchange="updateSetting('autoReplyThreshold', this.value)">
          <option value="high" ${s.autoReplyThreshold==='high'?'selected':''}>High Only</option>
          <option value="medium" ${s.autoReplyThreshold==='medium'?'selected':''}>Medium & High</option>
          <option value="low" ${s.autoReplyThreshold==='low'?'selected':''}>All Emails</option>
        </select>
      </div>
    </div>
    
    <div class="settings-section">
      <h3>⚡ Automation Settings</h3>
      ${[
        ['autoReply', 'Auto Reply', 'Automatically reply to emails based on AI analysis'],
        ['autoSummarize', 'Auto Summarize', 'Generate summaries for long emails automatically'],
        ['importanceDetection', 'Importance Detection', 'Automatically detect and flag important emails'],
        ['autoCategories', 'Auto Categorize', 'Automatically categorize incoming emails'],
        ['notificationsEnabled', 'Notifications', 'Show toast notifications for AI actions']
      ].map(([key, label, desc]) => `
        <div class="settings-row">
          <div>
            <div class="settings-label">${label}</div>
            <div class="settings-description">${desc}</div>
          </div>
          <button class="toggle ${s[key] ? 'on' : ''}" onclick="toggleSetting('${key}')"></button>
        </div>`).join('')}
    </div>
    
    <div class="settings-section">
      <h3>📊 Usage Statistics</h3>
      ${Object.entries(AppState.stats).map(([k,v]) => `
        <div class="settings-row">
          <div class="settings-label">${capitalize(k.replace(/([A-Z])/g, ' $1'))}</div>
          <div style="font-size:20px;font-weight:700;color:var(--accent-blue)">${v}</div>
        </div>`).join('')}
    </div>
    
    <div class="settings-section">
      <h3>🔧 Gmail API Setup Guide</h3>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.8">
        <p style="margin-bottom:10px">To use real Gmail integration in your deployment:</p>
        <ol style="padding-left:20px;display:flex;flex-direction:column;gap:6px">
          <li>Go to <strong>Google Cloud Console</strong> → Create a new project</li>
          <li>Enable the <strong>Gmail API</strong> in API Library</li>
          <li>Create <strong>OAuth 2.0 credentials</strong> for Web Application</li>
          <li>Add your domain to authorized origins</li>
          <li>Replace <code style="background:var(--bg-hover);padding:2px 6px;border-radius:4px">YOUR_GOOGLE_CLIENT_ID</code> in gmail_api.js</li>
          <li>Set your <strong>OpenAI API key</strong> above for GPT-4 powered responses</li>
        </ol>
      </div>
    </div>`;
}

// ---- EVENT HANDLERS & ACTIONS ----
function switchView(view) {
  AppState.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  const viewEl = document.getElementById('view-' + view);
  if (viewEl) viewEl.classList.add('active');
  
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  
  if (view === 'inbox') renderEmailList(AppState.emails, 'email-list');
  else if (view === 'important') renderEmailList(AppState.emails.filter(e => e.importance === 'high'), 'important-list');
  else if (view === 'drafts') renderEmailList(AppState.drafts, 'drafts-list');
  else if (view === 'sent') renderEmailList(AppState.sentEmails, 'sent-list');
  else if (view === 'categories') renderCategories();
  else if (view === 'analytics') renderAnalytics();
  else if (view === 'settings') renderSettingsPanel();
}

function openEmail(id) {
  const email = [...AppState.emails, ...AppState.drafts, ...AppState.sentEmails].find(e => e.id === id);
  if (!email) return;
  
  AppState.currentEmail = email;
  email.read = true;
  updateBadges();
  
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');
  
  content.innerHTML = `
    <div class="detail-email-header">
      <div class="detail-subject">${escHtml(email.subject)}</div>
      <div class="detail-from">From: ${escHtml(email.fromName)} &lt;${escHtml(email.from)}&gt;</div>
      <div class="detail-date">${email.date.toLocaleString()}</div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        ${email.tags.map(t => `<span class="tag tag-${t}">${t}</span>`).join('')}
      </div>
    </div>
    <div class="detail-body">${escHtml(email.body)}</div>
    <div id="ai-results"></div>`;
  
  panel.classList.add('open');
  
  if (AppState.settings.autoSummarize) {
    setTimeout(() => aiSummarize(true), 600);
  }
}

function closeDetail() {
  document.getElementById('detail-panel').classList.remove('open');
  AppState.currentEmail = null;
  if (AppState.currentView === 'inbox') renderEmailList(AppState.emails, 'email-list');
}

async function aiSummarize(auto = false) {
  if (!AppState.currentEmail) return;
  if (!auto) await AIEngine.process('Summarizing email with AI...', 1000);
  
  const result = AIEngine.summarize(AppState.currentEmail);
  AppState.stats.summarized++;
  AppState.stats.totalProcessed++;
  
  const aiResults = document.getElementById('ai-results');
  const existing = document.getElementById('summary-result');
  
  const html = `
    <div class="ai-result-box" id="summary-result">
      <h4>🤖 AI Summary</h4>
      <p>${escHtml(result.summary)}</p>
      <div style="margin-top:8px">${result.keyPoints.map(p => `<p style="color:var(--text-secondary);font-size:12px;margin-bottom:4px">${escHtml(p)}</p>`).join('')}</div>
      <div style="display:flex;gap:12px;margin-top:10px;font-size:11px;color:var(--text-muted)">
        <span>📝 ${result.wordCount} words</span>
        <span>⏱️ ~${result.readTime} min read</span>
        <span>🔥 Urgency: <strong style="color:${result.urgency==='HIGH'?'var(--accent-red)':result.urgency==='MEDIUM'?'var(--accent-orange)':'var(--accent-green)'}">${result.urgency}</strong></span>
      </div>
    </div>`;
  
  if (existing) existing.outerHTML = html;
  else aiResults.insertAdjacentHTML('beforeend', html);
  
  if (!auto) showToast('📋 Email summarized!', 'ai');
}

async function aiDraftReply() {
  if (!AppState.currentEmail) return;
  await AIEngine.process('Drafting reply with AI...', 1400);
  
  const draft = AIEngine.draftReply(AppState.currentEmail);
  AppState.stats.totalProcessed++;
  
  const aiResults = document.getElementById('ai-results');
  const existing = document.getElementById('draft-result');
  
  const html = `
    <div class="ai-result-box" id="draft-result">
      <h4>✍️ AI Drafted Reply</h4>
      <textarea id="draft-text">${escHtml(draft)}</textarea>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-sm btn-ai" onclick="aiImproveEmail()">✨ Improve</button>
        <button class="btn btn-sm btn-primary" onclick="sendDraftReply()">📤 Send Reply</button>
        <button class="btn btn-sm" onclick="saveDraftToList()">💾 Save Draft</button>
      </div>
    </div>`;
  
  if (existing) existing.outerHTML = html;
  else aiResults.insertAdjacentHTML('beforeend', html);
  
  showToast('✍️ Reply drafted!', 'ai');
}

async function aiAutoReply() {
  if (!AppState.currentEmail) return;
  await AIEngine.process('Generating auto-reply...', 1600);
  
  const reply = AIEngine.generateAutoReply(AppState.currentEmail);
  AppState.stats.autoReplied++;
  AppState.stats.totalProcessed++;
  
  // Add to sent
  AppState.sentEmails.unshift({
    id: 'sent-' + Date.now(),
    from: 'user@gmail.com', fromName: 'You',
    to: AppState.currentEmail.from,
    subject: 'Re: ' + AppState.currentEmail.subject,
    body: reply,
    date: new Date(), category: 'work', importance: 'medium',
    read: true, hasAttachment: false, tags: ['sent', 'auto-reply']
  });
  
  document.getElementById('ai-results').insertAdjacentHTML('beforeend', `
    <div class="ai-result-box">
      <h4>🤖 Auto-Reply Sent</h4>
      <p style="color:var(--accent-green)">✅ Reply automatically sent to ${escHtml(AppState.currentEmail.fromName)}</p>
      <p style="margin-top:6px;white-space:pre-wrap">${escHtml(reply.substring(0, 200))}...</p>
    </div>`);
  
  updateBadges();
  showToast('🤖 Auto-reply sent!', 'success');
}

async function aiDetectImportance() {
  if (!AppState.currentEmail) return;
  await AIEngine.process('Analyzing email importance...', 900);
  
  const result = AIEngine.detectImportance(AppState.currentEmail);
  AppState.currentEmail.importance = result.importance;
  AppState.stats.importantDetected++;
  AppState.stats.totalProcessed++;
  
  const colorMap = { high: 'importance-high', medium: 'importance-medium', low: 'importance-low' };
  
  document.getElementById('ai-results').insertAdjacentHTML('beforeend', `
    <div class="ai-result-box">
      <h4>⭐ Importance Analysis</h4>
      <div class="importance-badge ${colorMap[result.importance]}" style="margin-bottom:8px">
        ${result.importance === 'high' ? '🔴' : result.importance === 'medium' ? '🟡' : '🟢'} 
        ${capitalize(result.importance)} Priority
      </div>
      <div style="margin-bottom:6px">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Confidence Score</div>
        <div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${result.score}%;background:var(--ai-gradient);border-radius:4px"></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${result.score}%</div>
      </div>
      <p style="font-size:12px;color:var(--text-secondary)">${escHtml(result.reasoning)}</p>
    </div>`);
  
  if (result.importance === 'high') updateBadges();
  showToast(`⭐ Importance: ${result.importance.toUpperCase()}`, 'ai');
}

function toggleSelect(id) {
  if (AppState.selectedEmails.has(id)) AppState.selectedEmails.delete(id);
  else AppState.selectedEmails.add(id);
  
  document.getElementById('email-' + id)?.classList.toggle('selected', AppState.selectedEmails.has(id));
}

function selectAll() {
  const listEmails = getFilteredEmails();
  if (AppState.selectedEmails.size === listEmails.length) {
    AppState.selectedEmails.clear();
  } else {
    listEmails.forEach(e => AppState.selectedEmails.add(e.id));
  }
  renderEmailList(listEmails, 'email-list');
}

async function bulkAutoReply() {
  const selected = AppState.emails.filter(e => AppState.selectedEmails.has(e.id));
  if (!selected.length) { showToast('⚠️ No emails selected', 'error'); return; }
  
  await AIEngine.process(`Sending auto-replies to ${selected.length} emails...`, 2000);
  
  selected.forEach(email => {
    const reply = AIEngine.generateAutoReply(email);
    AppState.sentEmails.unshift({
      id: 'sent-' + Date.now() + Math.random(),
      from: 'user@gmail.com', fromName: 'You',
      to: email.from, subject: 'Re: ' + email.subject,
      body: reply, date: new Date(), category: 'work',
      importance: 'medium', read: true, hasAttachment: false, tags: ['sent', 'auto-reply']
    });
    AppState.stats.autoReplied++;
    AppState.stats.totalProcessed++;
  });
  
  AppState.selectedEmails.clear();
  showToast(`🤖 Sent ${selected.length} auto-replies!`, 'success');
  renderEmailList(AppState.emails, 'email-list');
  updateBadges();
}

async function bulkSummarize() {
  const selected = AppState.emails.filter(e => AppState.selectedEmails.has(e.id));
  if (!selected.length) { showToast('⚠️ No emails selected', 'error'); return; }
  
  await AIEngine.process(`Summarizing ${selected.length} emails...`, 1800);
  AppState.stats.summarized += selected.length;
  AppState.stats.totalProcessed += selected.length;
  showToast(`📋 Summarized ${selected.length} emails!`, 'ai');
}

async function runAIAnalysis() {
  await AIEngine.process('Running full AI analysis on inbox...', 2500);
  
  AppState.emails.forEach(email => {
    const cat = AIEngine.categorize(email);
    email.category = cat;
    const imp = AIEngine.detectImportance(email);
    email.importance = imp.importance;
    if (imp.importance === 'high' && !email.tags.includes('important')) email.tags.push('important');
    AppState.stats.totalProcessed++;
  });
  
  AppState.stats.categorized += AppState.emails.length;
  AppState.stats.importantDetected += AppState.emails.filter(e => e.importance === 'high').length;
  
  renderEmailList(AppState.emails, 'email-list');
  updateBadges();
  showToast(`🤖 AI analyzed ${AppState.emails.length} emails!`, 'ai');
}

function filterEmails(category) {
  const filtered = category === 'all' ? AppState.emails : AppState.emails.filter(e => e.category === category || (category === 'unread' && !e.read) || (category === 'important' && e.importance === 'high'));
  renderEmailList(filtered, 'email-list');
}

function filterByCategory(cat) {
  switchView('inbox');
  setTimeout(() => filterEmails(cat), 50);
}

function getFilteredEmails() { return AppState.emails; }

function searchEmails(event) {
  const query = event.target.value.toLowerCase();
  if (!query) { renderEmailList(AppState.emails, 'email-list'); return; }
  
  const results = AppState.emails.filter(e => 
    e.subject.toLowerCase().includes(query) ||
    e.from.toLowerCase().includes(query) ||
    e.fromName.toLowerCase().includes(query) ||
    e.body.toLowerCase().includes(query)
  );
  
  renderEmailList(results, 'email-list');
}

async function syncGmail() {
  if (!AppState.settings.gmailConnected) {
    showToast('⚠️ Connect Gmail first in Settings', 'error');
    switchView('settings');
    return;
  }
  await GmailAPI.fetchEmails();
}

function openComposeModal() {
  document.getElementById('compose-modal').classList.add('open');
}

function closeComposeModal(event) {
  if (!event || event.target.classList.contains('modal-overlay')) {
    document.getElementById('compose-modal').classList.remove('open');
  }
}

async function sendEmail() {
  const to = document.getElementById('compose-to').value;
  const subject = document.getElementById('compose-subject').value;
  const body = document.getElementById('compose-body').value;
  
  if (!to || !subject) { showToast('⚠️ Fill in To and Subject fields', 'error'); return; }
  
  await AIEngine.process('Sending email...', 1000);
  
  AppState.sentEmails.unshift({
    id: 'sent-' + Date.now(), from: 'user@gmail.com', fromName: 'You',
    to, subject, body, date: new Date(), category: 'work',
    importance: 'medium', read: true, hasAttachment: false, tags: ['sent']
  });
  
  closeComposeModal();
  showToast('📤 Email sent!', 'success');
}

async function saveAsDraft() {
  const to = document.getElementById('compose-to').value;
  const subject = document.getElementById('compose-subject').value;
  const body = document.getElementById('compose-body').value;
  
  AppState.drafts.unshift({
    id: 'draft-' + Date.now(), from: 'user@gmail.com', fromName: 'You (Draft)',
    to, subject: subject || '(No Subject)', body, date: new Date(), category: 'draft',
    importance: 'low', read: true, hasAttachment: false, tags: ['draft']
  });
  
  closeComposeModal();
  updateBadges();
  showToast('💾 Draft saved!', 'success');
}

async function aiImproveEmail() {
  const textarea = document.getElementById('compose-body') || document.getElementById('draft-text');
  if (!textarea) return;
  
  await AIEngine.process('Improving email with AI...', 1200);
  textarea.value = AIEngine.improveEmail(textarea.value);
  showToast('✨ Email improved!', 'ai');
}

async function aiGenerateEmail() {
  const to = document.getElementById('compose-to')?.value;
  const subject = document.getElementById('compose-subject')?.value;
  const body = document.getElementById('compose-body');
  if (!body) return;
  
  const prompt = subject || 'general email';
  await AIEngine.process('Generating email with AI...', 1400);
  body.value = AIEngine.generateEmail(prompt, to, subject);
  showToast('🤖 Email generated!', 'ai');
}

function sendDraftReply() {
  const text = document.getElementById('draft-text')?.value;
  if (!text || !AppState.currentEmail) return;
  
  AppState.sentEmails.unshift({
    id: 'sent-' + Date.now(), from: 'user@gmail.com', fromName: 'You',
    to: AppState.currentEmail.from, subject: 'Re: ' + AppState.currentEmail.subject,
    body: text, date: new Date(), category: 'work',
    importance: 'medium', read: true, hasAttachment: false, tags: ['sent', 'replied']
  });
  
  AppState.stats.autoReplied++;
  showToast('📤 Reply sent!', 'success');
  updateBadges();
}

function saveDraftToList() {
  const text = document.getElementById('draft-text')?.value;
  if (!text || !AppState.currentEmail) return;
  
  AppState.drafts.unshift({
    id: 'draft-' + Date.now(), from: 'user@gmail.com', fromName: 'You (Draft)',
    to: AppState.currentEmail.from, subject: 'Re: ' + AppState.currentEmail.subject,
    body: text, date: new Date(), category: 'draft',
    importance: 'low', read: true, hasAttachment: false, tags: ['draft']
  });
  
  updateBadges();
  showToast('💾 Draft saved!', 'success');
}

function updateSetting(key, value) {
  AppState.settings[key] = value;
}

function toggleSetting(key) {
  AppState.settings[key] = !AppState.settings[key];
  renderSettingsPanel();
}

function updateSettings() {}

// ---- UTILITIES ----
function updateBadges() {
  document.getElementById('inbox-badge').textContent = AppState.emails.filter(e => !e.read).length;
  document.getElementById('important-badge').textContent = AppState.emails.filter(e => e.importance === 'high').length;
  document.getElementById('drafts-badge').textContent = AppState.drafts.length;
}

function showAIOverlay(text = 'AI Processing...') {
  const overlay = document.getElementById('ai-overlay');
  document.getElementById('ai-overlay-text').textContent = text;
  overlay.classList.add('open');
}

function hideAIOverlay() {
  document.getElementById('ai-overlay').classList.remove('open');
}

function showToast(message, type = 'success') {
  if (!AppState.settings.notificationsEnabled && type !== 'error') return;
  
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.round(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.round(diff/3600000) + 'h ago';
  if (diff < 604800000) return Math.round(diff/86400000) + 'd ago';
  return date.toLocaleDateString();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---- INIT ----
function init() {
  AppState.emails = MOCK_EMAILS.map(e => ({...e}));
  
  // Auto-analyze on load
  AppState.emails.forEach(email => {
    const imp = AIEngine.detectImportance(email);
    email.importance = imp.importance;
    if (imp.importance === 'high' && !email.tags.includes('important')) email.tags.push('important');
  });
  
  renderEmailList(AppState.emails, 'email-list');
  updateBadges();
  
  document.getElementById('ai-status-text').textContent = 'AI Ready';
  
  // Show welcome toast
  setTimeout(() => showToast('🤖 AI Email System Ready!', 'ai'), 500);
  setTimeout(() => showToast(`📬 ${AppState.emails.filter(e=>!e.read).length} unread emails detected`, 'success'), 1500);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
