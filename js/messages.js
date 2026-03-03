// Messages management
let conversations = [];
let currentConversationId = null;

// Initialize messages page
document.addEventListener('DOMContentLoaded', () => {
    loadConversations();
    setupMessageListeners();
    renderConversations();
    updateEmptyState();
});

// Load conversations from localStorage
function loadConversations() {
    try {
        const stored = localStorage.getItem('unimart_conversations');
        conversations = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading conversations:', error);
        conversations = [];
    }
}

// Save conversations to localStorage
function saveConversations() {
    try {
        localStorage.setItem('unimart_conversations', JSON.stringify(conversations));
    } catch (error) {
        console.error('Error saving conversations:', error);
    }
}

// Setup message event listeners
function setupMessageListeners() {
    // Search conversations
    const searchInput = document.getElementById('searchConversations');
    if (searchInput) {
        searchInput.addEventListener('input', filterConversations);
    }

    // Send message
    const sendBtn = document.getElementById('btnSendMessage');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    // Message input enter key
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Close chat button
    const closeBtn = document.getElementById('btnCloseChat');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeChat);
    }
}

// Render conversations list
function renderConversations() {
    const list = document.getElementById('conversationsList');
    if (!list) return;

    list.innerHTML = '';

    if (conversations.length === 0) {
        document.getElementById('conversationsEmpty').style.display = 'flex';
        return;
    }

    conversations.forEach(conv => {
        const item = createConversationItem(conv);
        list.appendChild(item);
    });
}

// Create conversation item element
function createConversationItem(conversation) {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    if (conversation.id === currentConversationId) {
        item.classList.add('active');
    }

    const lastMessage = conversation.messages.length > 0 
        ? conversation.messages[conversation.messages.length - 1].text 
        : 'No messages yet';

    const lastTime = conversation.messages.length > 0 
        ? formatTime(conversation.messages[conversation.messages.length - 1].timestamp)
        : formatTime(conversation.createdAt);

    item.innerHTML = `
        <div class="conversation-avatar">
            ${conversation.productEmoji}
        </div>
        <div class="conversation-content">
            <div class="conversation-title">${conversation.productName}</div>
            <div class="conversation-seller">with ${conversation.sellerName}</div>
            <div class="conversation-preview">${lastMessage}</div>
        </div>
        <div class="conversation-time">${lastTime}</div>
        ${!conversation.read ? '<div class="conversation-unread"></div>' : ''}
    `;

    item.addEventListener('click', () => openConversation(conversation.id));
    return item;
}

// Open a conversation
function openConversation(conversationId) {
    currentConversationId = conversationId;
    const conversation = conversations.find(c => c.id === conversationId);

    if (!conversation) return;

    // Mark as read
    conversation.read = true;
    saveConversations();

    // Update UI
    document.getElementById('chatEmpty').style.display = 'none';
    document.getElementById('chatActive').style.display = 'flex';

    // Update chat header
    document.getElementById('chatProductTitle').textContent = conversation.productName;
    document.getElementById('chatSellerName').textContent = `with ${conversation.sellerName}`;

    // Render messages
    renderMessages(conversation);

    // Re-render conversations to update active state
    renderConversations();

    // Focus message input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.focus();
    }
}

// Render messages in chat area
function renderMessages(conversation) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    conversation.messages.forEach(msg => {
        const msgElement = document.createElement('div');
        msgElement.className = `message ${msg.sent ? 'sent' : 'received'}`;
        msgElement.innerHTML = `
            <div class="message-content">${escapeHtml(msg.text)}</div>
            <div class="message-time">${formatTime(msg.timestamp)}</div>
        `;
        messagesContainer.appendChild(msgElement);
    });

    // Scroll to bottom
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 0);
}

// Send a message
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput || !currentConversationId) return;

    const text = messageInput.value.trim();
    if (!text) return;

    const conversation = conversations.find(c => c.id === currentConversationId);
    if (!conversation) return;

    // Add message
    conversation.messages.push({
        text: text,
        timestamp: new Date().toISOString(),
        sent: true
    });

    // Update conversation read status and timestamp
    conversation.read = true;
    conversation.updatedAt = new Date().toISOString();

    saveConversations();
    messageInput.value = '';
    renderMessages(conversation);
    renderConversations();

    // Simulate seller response (optional - for demo purposes)
    simulateSellerResponse(conversation);
}

// Simulate seller response (demo feature)
function simulateSellerResponse(conversation) {
    const responses = [
        'Thanks for the message!',
        'I\'ll get back to you soon.',
        'Let me check on that for you.',
        'Sounds good!',
        'When would you like to meet?',
        'The item is still available.',
        'I can arrange delivery for you.'
    ];

    // Add a small delay before response
    setTimeout(() => {
        if (currentConversationId === conversation.id) {
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            conversation.messages.push({
                text: randomResponse,
                timestamp: new Date().toISOString(),
                sent: false
            });
            conversation.read = true;
            saveConversations();
            renderMessages(conversation);
            renderConversations();
        }
    }, 1500);
}

// Close current conversation
function closeChat() {
    currentConversationId = null;
    document.getElementById('chatEmpty').style.display = 'flex';
    document.getElementById('chatActive').style.display = 'none';
    renderConversations();
}

// Filter conversations by search
function filterConversations() {
    const searchInput = document.getElementById('searchConversations');
    const searchTerm = searchInput.value.toLowerCase();

    const list = document.getElementById('conversationsList');
    list.innerHTML = '';

    const filtered = conversations.filter(conv => 
        conv.productName.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0 && searchTerm) {
        list.innerHTML = '<div style="padding: 24px; text-align: center; color: #6b7280;">No conversations found</div>';
        return;
    }

    filtered.length === 0 && !searchTerm ?
        document.getElementById('conversationsEmpty').style.display = 'flex' :
        document.getElementById('conversationsEmpty').style.display = 'none';

    filtered.forEach(conv => {
        const item = createConversationItem(conv);
        list.appendChild(item);
    });
}

// Update empty state visibility
function updateEmptyState() {
    const isEmpty = conversations.length === 0;
    document.getElementById('conversationsEmpty').style.display = isEmpty ? 'flex' : 'none';
    if (isEmpty) {
        document.getElementById('chatEmpty').style.display = 'flex';
        document.getElementById('chatActive').style.display = 'none';
    }
}

// Format timestamp to readable format
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Add conversation (called from marketplace when "Chat with Seller" is clicked)
function addConversation(product, sellerName) {
    // Check if conversation already exists for this product
    const existingConv = conversations.find(c => c.productId === product.id);
    if (existingConv) {
        // Open existing conversation
        currentConversationId = existingConv.id;
        renderConversations();
        openConversation(existingConv.id);
        return;
    }

    // Create new conversation
    const conversationId = 'conv_' + Date.now();
    const newConversation = {
        id: conversationId,
        productId: product.id,
        productName: product.title,
        productEmoji: product.image,
        sellerName: sellerName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        read: true,
        messages: []
    };

    conversations.push(newConversation);
    saveConversations();
    currentConversationId = conversationId;
    renderConversations();
    openConversation(conversationId);
}

// Make addConversation available globally
window.addConversation = addConversation;
