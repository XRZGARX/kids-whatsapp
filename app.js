// ===== المتغيرات العامة =====
let myName = 'أنا';
let myAvatar = '🧒';
let myAvatarImg = '';
let myUsername = '';
let lastGoodUsername = '';
let pendingUsername = null;
let activeChatId = null;
let selectedNewAvatar = '🧒';
let currentTheme = 'rainbow';
let notificationsEnabled = true;
let soundsEnabled = true;

// متغيرات المكالمات
let peer = null;
let currentCall = null;
let incomingCall = null;
let localStream = null;
let remoteStream = null;
let callType = null; // 'audio' | 'video'
let incomingCallType = 'audio';
let incomingCallName = '';
let incomingCallAvatar = '';
let incomingCallPhoto = '';
let isMuted = false;
let isVideoOn = true;
let callTimer = null;
let callSeconds = 0;
let callTimeout = null;
let weatherTimer = null;
let callConnected = false;

// مؤثرات صوتية
let audioCtx = null;
const SOUNDS = {
    send: { freq: 700, dur: 0.1, type: 'sine' },
    receive: { freq: 900, dur: 0.15, type: 'sine' },
    open: { freq: 600, dur: 0.1, type: 'triangle' }
};

// بيانات التطبيق
let chats = [
    {
        id: 'c1',
        name: 'سارة',
        avatar: '👧',
        username: '',
        messages: [
            { text: 'مرحباً! كيف حالك؟ 😊', sent: false, time: '10:30' },
            { text: 'هل نحن أصدقاء بعد؟ 🌈', sent: false, time: '10:31' }
        ],
        unread: 2
    },
    {
        id: 'c2',
        name: 'أحمد',
        avatar: '🐸',
        username: '',
        messages: [
            { text: 'صل أنا! 🎮', sent: true, time: '09:15' },
            { text: 'العب معي اللعبة الجديدة!', sent: false, time: '09:20' }
        ],
        unread: 1
    },
    {
        id: 'c3',
        name: 'ليلى',
        avatar: '🦄',
        username: '',
        messages: [
            { text: 'أحب الألوان الجميلة 🎨', sent: false, time: 'أمس' }
        ],
        unread: 0
    }
];

// رسائل الرد التلقائي الممتعة
const AUTO_REPLIES = [
    'واو رائع! 🌈',
    'أنا أحب هذا 😍',
    'ههههه 🤣',
    'يمكننا أن نلعب معاً! 🎮',
    'أنا مشغول الآن لكن لاحقاً 📚',
    'شكراً لك! 🎁',
    'ماذا حدث؟ 🧐',
    'أنت أفضل صديق! 😊',
    'دعنا نأكل البيتزا! 🍕',
    'أغمض عينيك... مفاجأة! 🎁'
];

// ===== تهيئة التطبيق =====
function init() {
    loadData();
    setTimeout(() => {
        document.getElementById('splash-screen').style.display = 'none';
        document.getElementById('app').classList.remove('hidden');
        renderChatList();
        notifySetup();
        if (!myUsername) {
            document.getElementById('welcome-screen').classList.remove('hidden');
            setTimeout(() => document.getElementById('welcome-username').focus(), 200);
        } else {
            setupPeer();
        }
    }, 2500);
}

function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem('kidsWhatsAppData'));
        if (saved) {
            myName = saved.myName || myName;
            myAvatar = saved.myAvatar || myAvatar;
            myAvatarImg = saved.myAvatarImg || '';
            myUsername = saved.myUsername || '';
            currentTheme = saved.currentTheme || 'rainbow';
            notificationsEnabled = saved.notificationsEnabled !== false;
            soundsEnabled = saved.soundsEnabled !== false;
            if (Array.isArray(saved.chats) && saved.chats.length > 0) chats = saved.chats;
        }
    } catch (e) { /* تجاهل الأخطاء */ }

    // هجرة البيانات القديمة: الكود العشوائي → يوزر نيم
    chats.forEach(c => {
        if (c.username === undefined) {
            c.username = c.peerId || '';
            delete c.peerId;
        }
    });
}

function saveData() {
    const data = {
        myName: myName,
        myAvatar: myAvatar,
        myAvatarImg: myAvatarImg,
        myUsername: myUsername,
        currentTheme: currentTheme,
        notificationsEnabled: notificationsEnabled,
        soundsEnabled: soundsEnabled,
        chats: chats
    };
    localStorage.setItem('kidsWhatsAppData', JSON.stringify(data));
}

// ===== اليوزر نيم =====
function isValidUsername(name) {
    return /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,19}$/.test(name);
}

function showWelcomeError(msg) {
    const el = document.getElementById('welcome-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('welcome-btn').classList.remove('welcome-btn-loading');
    document.getElementById('welcome-btn').textContent = 'ابدأ المغامرة! 🚀';
}

function handleWelcomeEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        chooseUsername();
    }
}

function handleUsernameEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveUsername();
    }
}

function chooseUsername() {
    const input = document.getElementById('welcome-username');
    const name = input.value.trim();
    const errEl = document.getElementById('welcome-error');
    errEl.classList.add('hidden');

    if (!name) {
        showWelcomeError('✏️ اكتب يوزر نيم أولاً');
        return;
    }
    if (!isValidUsername(name)) {
        showWelcomeError('😅 يوزر نيم يجب أن يكون بحروف إنجليزية وأرقام فقط، بدون مسافات، من 2 إلى 20 حرفاً');
        return;
    }

    myUsername = name;
    lastGoodUsername = '';
    saveData();

    const btn = document.getElementById('welcome-btn');
    btn.classList.add('welcome-btn-loading');
    btn.textContent = '⏳ جاري تجهيز حسابك...';

    if (setupPeer()) return;
    showWelcomeError('😢 تعذر الاتصال بخادم المكالمات، تحقق من الإنترنت وحاول مجدداً');
}

function saveUsername() {
    const input = document.getElementById('my-username');
    const name = input.value.trim();

    if (!isValidUsername(name)) {
        showToast('😅 يوزر نيم يجب أن يكون بحروف إنجليزية وأرقام فقط، من 2 إلى 20 حرفاً');
        return;
    }
    if (name.toLowerCase() === myUsername.toLowerCase()) {
        showToast('👌 هذا هو يوزر نيمك الحالي');
        return;
    }

    pendingUsername = { before: myUsername, after: name };
    myUsername = name;
    saveData();
    showToast('⏳ جاري التحقق من توفر اليوزر نيم...');
    restartPeer();
}

function copyMyUsername() {
    const username = document.getElementById('my-username').value;
    if (navigator.clipboard && username) {
        navigator.clipboard.writeText(username).then(() => {
            showToast('📋 تم نسخ يوزر نيمك! أرسله لأصدقائك');
        }).catch(() => {
            selectAndCopy('my-username');
        });
    } else {
        selectAndCopy('my-username');
        showToast('📋 تم نسخ يوزر نيمك!');
    }
}

function selectAndCopy(id) {
    const input = document.getElementById(id);
    input.select();
    input.setSelectionRange(0, 9999);
    document.execCommand('copy');
}

function updateUsernameUI() {
    const input = document.getElementById('my-username');
    if (input && myUsername) input.value = myUsername;
}

function handleUsernameTaken() {
    const welcome = document.getElementById('welcome-screen');
    if (welcome && !welcome.classList.contains('hidden')) {
        myUsername = '';
        lastGoodUsername = '';
        saveData();
        showWelcomeError('😢 هذا اليوزر نيم مستخدم من شخص آخر! اختر يوزر نيم آخر');
        return;
    }
    if (pendingUsername) {
        myUsername = pendingUsername.before;
        saveData();
        pendingUsername = null;
        restartPeer();
        showToast('⚠️ هذا اليوزر نيم مستخدم - تم الاحتفاظ بيوزر نيمك القديم');
    }
}

function handleUserFacingUsernameError(err) {
    if (err.type === 'invalid-id' || err.type === 'invalid-key') {
        const welcome = document.getElementById('welcome-screen');
        if (welcome && !welcome.classList.contains('hidden')) {
            showWelcomeError('😅 يوزر نيم يجب أن يكون بحروف إنجليزية وأرقام فقط');
        } else {
            showToast('😅 يوزر نيم غير صالح - استخدم حروفاً إنجليزية وأرقاماً');
            handleUsernameTaken();
        }
    }
}

// ===== إعداد PeerJS =====
let peerGen = 0;

function restartPeer() {
    peerGen++;
    if (peer) {
        try { peer.destroy(); } catch (e) {}
        peer = null;
    }
    setupPeer();
}

function setupPeer() {
    if (!myUsername) return false;
    const gen = ++peerGen;

    try {
        peer = new Peer(myUsername, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
                    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
                    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
                ]
            }
        });
    } catch (e) {
        console.log('Peer setup error:', e);
        return false;
    }

    peer.on('open', (id) => {
        myUsername = id;
        lastGoodUsername = id;
        saveData();
        updateUsernameUI();

        // إكمال اختيار اليوزر نيم
        const welcome = document.getElementById('welcome-screen');
        if (welcome && !welcome.classList.contains('hidden')) {
            welcome.classList.add('hidden');
            showToast('مرحباً يا ' + myUsername + '! 🎉');
        }
        if (pendingUsername) {
            pendingUsername = null;
            showToast('✅ تم تغيير يوزر نيمك بنجاح!');
        }
    });

    peer.on('call', (call) => {
        incomingCall = call;
        const meta = call.metadata || {};
        incomingCallType = meta.type === 'video' ? 'video' : 'audio';
        incomingCallName = meta.name || 'صديق';
        incomingCallAvatar = meta.avatar || '🧒';
        incomingCallPhoto = meta.photo || '';

        // البحث عن المحادثة المقابلة عبر يوزر نيم المتصل
        const callerChat = chats.find(c => c.username && c.username.toLowerCase() === call.peer.toLowerCase());
        if (callerChat) {
            incomingCallName = callerChat.name;
            incomingCallAvatar = callerChat.avatar;
        }

        showIncomingCallScreen();
        playRingtone();
    });

    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            handleUsernameTaken();
        } else if (err.type === 'invalid-id' || err.type === 'invalid-key') {
            handleUserFacingUsernameError(err);
        } else if (err.type === 'peer-unavailable') {
            showToast('⚠️ الصديق غير متصل الآن');
            if (!callConnected && document.getElementById('call-screen') && !document.getElementById('call-screen').classList.contains('hidden')) {
                endCallCleanup(false);
            }
        } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error' || err.type === 'socket-closed') {
            // حاول إعادة الاتصال تلقائياً
            if (peer && !peer.destroyed) {
                setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 3000);
            }
        } else if (err.type === 'browser-incompatible') {
            showToast('⚠️ متصفحك لا يدعم المكالمات');
        }
        console.log('PeerJS error:', err.type, err.message);
    });

    peer.on('disconnected', () => {
        if (peer && !peer.destroyed && myUsername) {
            setTimeout(() => {
                try { peer.reconnect(); } catch (e) {}
            }, 2000);
        }
    });

    peer.on('close', () => {
        if (gen !== peerGen) return;
        peer = null;
        if (myUsername) setupPeer();
    });

    return true;
}

// ===== الإشعارات =====
function notifySetup() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showNotification(title, body) {
    if (!notificationsEnabled) return;
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, { body: body, icon: '🧸' });
        } catch (e) {}
    }
}

// ===== عرض قائمة المحادثات =====
function renderChatList() {
    const list = document.getElementById('chat-list');
    list.innerHTML = '';

    if (chats.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎈</div>
                <h2>لا توجد محادثات بعد</h2>
                <p>اضغط على زر 💬 لبدء محادثة جديدة مع صديق!</p>
            </div>`;
        return;
    }

    chats.forEach(chat => {
        const lastMsg = chat.messages[chat.messages.length - 1];
        const preview = lastMsg ? (lastMsg.sent ? 'أنت: ' : '') + lastMsg.text : 'بداية المحادثة';
        const time = lastMsg ? lastMsg.time : '';
        const avatar = getAvatarEmoji(chat.avatar);

        const item = document.createElement('div');
        item.className = 'chat-item';
        item.onclick = () => openChat(chat.id);
        item.innerHTML = `
            <div class="chat-avatar">${avatar}</div>
            <div class="chat-info">
                <h3>${escapeHtml(chat.name)}</h3>
                <p class="chat-preview">${escapeHtml(preview)}</p>
            </div>
            <div class="chat-meta">
                <span class="chat-time">${time}</span>
                ${chat.unread > 0 ? `<div class="unread-badge">${chat.unread}</div>` : ''}
            </div>`;
        list.appendChild(item);
    });
}

function getAvatarEmoji(avatar) {
    const avatars = {
        '🧒': '🧒', '👧': '👧', '🦄': '🦄', '🐱': '🐱', '🐶': '🐶',
        '🐰': '🐰', '🐻': '🐻', '🐼': '🐼', '🦁': '🦁', '🐸': '🐸',
        '🦊': '🦊', '🐨': '🐨'
    };
    return avatars[avatar] || '🧒';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== التنقل =====
function openChat(chatId) {
    activeChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    chat.unread = 0;

    document.getElementById('chat-view').classList.remove('hidden');
    document.getElementById('chat-list').style.display = 'none';
    document.querySelector('.fab-btn').style.display = 'none';

    document.getElementById('chat-name').textContent = chat.name;
    document.getElementById('chat-avatar').textContent = getAvatarEmoji(chat.avatar);

    // حالة الاتصال
    const statusEl = document.getElementById('online-status');
    if (chat.username) {
        statusEl.textContent = 'يوزر نيم: ' + chat.username + ' 📞';
    } else {
        statusEl.textContent = 'أضف يوزر نيمه للمكالمات ✏️';
    }

    renderMessages();
    updateChatInfoModal();
    saveData();
}

function goBack() {
    document.getElementById('chat-view').classList.add('hidden');
    document.getElementById('chat-list').style.display = '';
    document.querySelector('.fab-btn').style.display = '';
    activeChatId = null;
    document.getElementById('message-input').value = '';
    document.getElementById('emoji-picker').classList.add('hidden');
    renderChatList();
}

function getActiveChat() {
    return chats.find(c => c.id === activeChatId);
}

function renderMessages() {
    const chat = getActiveChat();
    if (!chat) return;
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';

    chat.messages.forEach(msg => {
        addMessageToDOM(msg);
    });

    scrollToBottom();
}

function addMessageToDOM(msg) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = msg.time;

    div.className = 'message ' + (msg.sent ? 'sent' : 'received');
    div.textContent = msg.text;
    div.appendChild(time);

    // علامة القراءة
    if (msg.sent) {
        const check = document.createElement('span');
        check.className = 'message-check';
        check.textContent = msg.read ? '✓✓' : '✓';
        time.appendChild(check);
    }

    container.appendChild(div);
}

// ===== الرسائل =====
function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text || !activeChatId) return;

    const chat = getActiveChat();
    const now = new Date();
    const timeStr = now.toLocaleTimeString(['ar', 'en'], { hour: '2-digit', minute: '2-digit' });

    chat.messages.push({ text: text, sent: true, time: timeStr, read: false });
    input.value = '';
    renderMessages();
    saveData();
    playSound('send');

    // محاكاة علامة القراءة
    setTimeout(() => {
        const lastMsg = chat.messages[chat.messages.length - 1];
        if (lastMsg && lastMsg.sent) {
            lastMsg.read = true;
            renderMessages();
        }
    }, 1500);

    // لوحة الإيموجي مخفية
    document.getElementById('emoji-picker').classList.add('hidden');

    // الرد التلقائي من الأصدقاء التجريبيين
    if (!chat.username && Math.random() > 0.3) {
        showTypingIndicator();
        const delay = 2000 + Math.random() * 3000;
        setTimeout(() => {
            const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
            const replyTime = new Date().toLocaleTimeString(['ar', 'en'], { hour: '2-digit', minute: '2-digit' });
            chat.messages.push({ text: reply, sent: false, time: replyTime });
            chat.unread = (chat.unread || 0) + 1;
            hideTypingIndicator();
            renderMessages();
            saveData();
            playSound('receive');
            showNotification(chat.name, reply);
            if (notificationsEnabled && Notification.permission === 'granted') {
                setTimeout(() => { chat.unread = 0; renderChatList(); }, 1500);
            }
        }, delay);
    }
}

function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(div);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
}

// ===== الإيموجي =====
function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    picker.classList.toggle('hidden');
}

function addEmoji(emoji) {
    const input = document.getElementById('message-input');
    input.value += emoji;
    input.focus();
}

// ===== البحث =====
function showSearch() {
    document.getElementById('search-bar').classList.remove('hidden');
    document.getElementById('search-bar').querySelector('input').focus();
}

function hideSearch() {
    document.getElementById('search-bar').classList.add('hidden');
    document.querySelector('#search-bar input').value = '';
    renderChatList();
}

function searchChat(query) {
    query = query.trim();
    const list = document.getElementById('chat-list');
    list.innerHTML = '';

    const filtered = chats.filter(chat =>
        chat.name.includes(query) ||
        chat.messages.some(m => m.text.includes(query))
    );

    filtered.forEach(chat => {
        const lastMsg = chat.messages[chat.messages.length - 1];
        const preview = lastMsg ? (lastMsg.sent ? 'أنت: ' : '') + lastMsg.text : '';
        const item = document.createElement('div');
        item.className = 'chat-item';
        item.onclick = () => { hideSearch(); openChat(chat.id); };
        item.innerHTML = `
            <div class="chat-avatar">${getAvatarEmoji(chat.avatar)}</div>
            <div class="chat-info">
                <h3>${escapeHtml(chat.name)}</h3>
                <p class="chat-preview">${escapeHtml(preview)}</p>
            </div>`;
        list.appendChild(item);
    });

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>لا توجد نتائج للبحث</p></div>`;
    }
}

// ===== محادثة جديدة =====
function showNewChat() {
    selectedNewAvatar = '🧒';
    document.getElementById('new-chat-name').value = '';
    document.getElementById('new-chat-username').value = '';
    document.getElementById('new-chat-modal').classList.remove('hidden');
}

function hideNewChat() {
    document.getElementById('new-chat-modal').classList.add('hidden');
}

function selectAvatar(el, emoji) {
    document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
    el.classList.add('selected');
    selectedNewAvatar = emoji;
}

function validateUsername(input) {
    input.value = input.value.replace(/[^a-zA-Z0-9-_]/g, '');
}

function createNewChat() {
    const name = document.getElementById('new-chat-name').value.trim();
    const username = document.getElementById('new-chat-username').value.trim();
    if (!name) {
        showToast('📝 أدخل اسم الصديق أولاً');
        return;
    }
    if (username && !isValidUsername(username)) {
        showToast('😅 يوزر نيم الصديق يجب أن يكون بحروف إنجليزية وأرقام فقط، من 2 إلى 20 حرفاً');
        return;
    }

    const chat = {
        id: 'c' + Date.now(),
        name: name,
        avatar: selectedNewAvatar,
        username: username,
        messages: [],
        unread: 0
    };
    chats.unshift(chat);
    hideNewChat();
    renderChatList();
    saveData();
    openChat(chat.id);
    playSound('open');
}

// ===== الإعدادات =====
function showSettings() {
    document.getElementById('my-name').value = myName;
    renderMyAvatar();
    const unameEl = document.getElementById('my-username');
    unameEl.value = myUsername || '';
    unameEl.placeholder = myUsername ? myUsername : 'اختر يوزر نيم...';
    document.getElementById('notifications-toggle').checked = notificationsEnabled;
    document.getElementById('sounds-toggle').checked = soundsEnabled;
    document.getElementById('settings-modal').classList.remove('hidden');
}

function hideSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function updateMyName() {
    const name = document.getElementById('my-name').value.trim();
    if (name) {
        myName = name;
        saveData();
        showToast('✅ تم التحديث!');
    }
}

// ===== الصورة الشخصية =====
function renderMyAvatar() {
    const el = document.getElementById('my-avatar');
    if (!el) return;
    if (myAvatarImg) {
        el.innerHTML = '<img src="' + myAvatarImg + '" alt="صورتي">';
        el.classList.add('has-photo');
    } else {
        el.textContent = getAvatarEmoji(myAvatar) || myAvatar;
        el.classList.remove('has-photo');
    }
}

const MY_AVATAR_CHOICES = ['🧒', '👧', '🦄', '🐱', '🐶', '🐰', '🐻', '🐼', '🦁', '🐸', '🦊', '🐨', '🦋', '🌸', '🌟', '🍓'];

function openAvatarPicker() {
    const grid = document.getElementById('my-avatar-options');
    grid.innerHTML = '';
    MY_AVATAR_CHOICES.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'avatar-option';
        span.textContent = emoji;
        if (emoji === myAvatar && !myAvatarImg) span.classList.add('selected');
        span.onclick = () => selectMyAvatar(span, emoji);
        grid.appendChild(span);
    });
    document.getElementById('avatar-picker-modal').classList.remove('hidden');
}

function hideAvatarPicker() {
    document.getElementById('avatar-picker-modal').classList.add('hidden');
}

function selectMyAvatar(el, emoji) {
    myAvatar = emoji;
    myAvatarImg = '';
    saveData();
    renderMyAvatar();
    hideAvatarPicker();
    showToast('🎨 تم تحديث صورتك!');
}

function handleAvatarUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
        showToast('😅 هذا الملف ليس صورة');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const size = 256;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, size, size);
            myAvatarImg = canvas.toDataURL('image/jpeg', 0.85);
            myAvatar = '🧒';
            saveData();
            renderMyAvatar();
            hideAvatarPicker();
            event.target.value = '';
            showToast('📷 تم تحديث صورتك!');
        };
        img.onerror = () => {
            showToast('😅 تعذر قراءة الصورة');
            event.target.value = '';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function changeTheme(theme) {
    const app = document.getElementById('app');

    // إزالة الثيمات القديمة
    document.body.classList.remove('theme-ocean', 'theme-forest', 'theme-space');
    app.classList.remove('theme-ocean', 'theme-forest', 'theme-space');

    currentTheme = theme;
    if (theme !== 'rainbow') {
        document.body.classList.add('theme-' + theme);
        app.classList.add('theme-' + theme);
    }
    saveData();
    showToast('🎨 تم تغيير الثيم!');
}

// ===== معلومات المحادثة =====
function updateChatInfoModal() {
    const chat = getActiveChat();
    if (!chat) return;
    document.getElementById('info-avatar').textContent = getAvatarEmoji(chat.avatar);
    document.getElementById('info-name').textContent = chat.name;
    document.getElementById('info-messages').textContent = chat.messages.length;
    const emojiCount = chat.messages.filter(m => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(m.text)).length;
    document.getElementById('info-emojis').textContent = emojiCount;
}

function showChatInfo() {
    updateChatInfoModal();
    document.getElementById('chat-info-modal').classList.remove('hidden');
}

function hideChatInfo() {
    document.getElementById('chat-info-modal').classList.add('hidden');
}

function deleteCurrentChat() {
    if (!activeChatId) return;
    const chat = getActiveChat();
    if (!confirm('هل تريد حذف المحادثة مع ' + chat.name + '؟')) return;
    chats = chats.filter(c => c.id !== activeChatId);
    hideChatInfo();
    goBack();
    renderChatList();
    saveData();
    showToast('🗑️ تم حذف المحادثة');
}

// ===== المؤثرات الصوتية =====
function playSound(type) {
    if (!soundsEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const s = SOUNDS[type];
        if (!s) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = s.type;
        osc.frequency.value = s.freq;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + s.dur);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + s.dur);
    } catch (e) {}
}

// رنّة المكالمة
let ringtoneInterval = null;
function playRingtone() {
    stopRingtone();
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        ringtoneInterval = setInterval(() => {
            try {
                if (!audioCtx || audioCtx.state === 'closed') return;
                const freq = incomingCall && incomingCall.metadata && (incomingCall.metadata.type || incomingCallType) === 'video' ? 1000 : 800;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
                osc.connect(gain).connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 1.2);
            } catch (e) {}
        }, 1500);
    } catch (e) {}
}

function stopRingtone() {
    if (ringtoneInterval) {
        clearInterval(ringtoneInterval);
        ringtoneInterval = null;
    }
}

// ===== المكالمات - عرض الشاشات =====
function getCallElements() {
    return {
        screen: document.getElementById('call-screen'),
        avatar: document.getElementById('call-avatar'),
        name: document.getElementById('call-name'),
        status: document.getElementById('call-status'),
        timer: document.getElementById('call-timer'),
        weather: document.getElementById('call-emoji'),
        videoContainer: document.getElementById('video-container'),
        localVideo: document.getElementById('local-video'),
        remoteVideo: document.getElementById('remote-video'),
        muteBtn: document.getElementById('mute-btn'),
        videoBtn: document.getElementById('video-btn'),
        acceptBtn: document.getElementById('accept-btn'),
        endBtn: document.querySelector('.ctrl-btn.end'),
        offlineNotice: document.getElementById('offline-notice')
    };
}

const CALL_EMOJIS = ['🎈', '🎀', '⭐', '🌞', '🌟', '🌈', '🎉', '🦄', '☀️', '💖'];

function startWeatherAnimation() {
    stopWeatherAnimation();
    weatherTimer = setInterval(() => {
        const random = CALL_EMOJIS[Math.floor(Math.random() * CALL_EMOJIS.length)];
        const el = document.getElementById('call-emoji');
        if (el) el.textContent = random;
    }, 2000);
}

function stopWeatherAnimation() {
    if (weatherTimer) {
        clearInterval(weatherTimer);
        weatherTimer = null;
    }
}

function renderAvatarInto(el, avatar, photo) {
    if (photo) {
        el.innerHTML = '<img src="' + photo + '" alt="صورة">';
        el.classList.add('has-photo');
    } else {
        el.textContent = getAvatarEmoji(avatar) || avatar;
        el.classList.remove('has-photo');
    }
}

function showCallScreenBase(name, avatar, photo) {
    const el = getCallElements();
    el.screen.classList.remove('hidden');
    renderAvatarInto(el.avatar, avatar, photo || '');
    el.name.textContent = name;
    el.timer.textContent = '00:00';
    el.timer.classList.add('hidden');
    el.videoContainer.classList.add('hidden');
    el.offlineNotice.classList.add('hidden');
    el.acceptBtn.classList.add('hidden');
    startWeatherAnimation();
    return el;
}

// شاشة مكالمة خارجة
function showOutgoingCallScreen(name, avatar, type) {
    const el = showCallScreenBase(name, avatar, '');
    el.screen.classList.remove('ringing');
    el.screen.classList.add('outgoing');
    el.status.textContent = type === 'video' ? 'جاري الاتصال بفيديو 🎥...' : 'جاري الاتصال...';
    el.status.classList.add('ringing');
    el.videoBtn.classList.remove('hidden');
    el.muteBtn.classList.remove('muted');
    el.videoBtn.classList.remove('video-off');
    el.videoBtn.classList.add('active');
}

// شاشة مكالمة واردة
function showIncomingCallScreen() {
    const el = showCallScreenBase(incomingCallName, incomingCallAvatar, incomingCallPhoto);
    el.screen.classList.remove('outgoing');
    el.screen.classList.add('ringing');
    el.status.textContent = incomingCallType === 'video' ? '🎥 يريد فيديو معك!' : 'يريد التحدث معك!';
    el.status.classList.add('ringing');
    el.acceptBtn.classList.remove('hidden');
    el.videoBtn.classList.add('hidden');
}

// شاشة مكالمة نشطة
function showActiveCallScreen(name, avatar, type) {
    const el = showCallScreenBase(name, avatar);
    el.screen.classList.remove('outgoing', 'ringing');
    el.screen.classList.add('active-call');
    el.status.textContent = 'متصل الآن! 🎉';
    el.status.classList.remove('ringing');
    el.acceptBtn.classList.add('hidden');
    el.timer.classList.remove('hidden');
    el.videoBtn.classList.remove('hidden');
    el.muteBtn.classList.remove('muted');
    el.videoBtn.classList.add('active');

    if (type === 'video') {
        el.videoContainer.classList.remove('hidden');
        if (localStream) {
            el.localVideo.srcObject = localStream;
            el.localVideo.play().catch(() => {});
        }
        el.videoBtn.textContent = '📹 فيديو';
    } else {
        el.videoBtn.textContent = '📹';
        el.videoBtn.classList.add('video-off');
        el.videoBtn.classList.remove('active');
    }

    startCallTimer();
    playSound('open');
}

// ===== بدء المكالمات =====
function startVoiceCall() {
    startCall('audio');
}

function startVideoCall() {
    startCall('video');
}

function startCall(type) {
    const chat = getActiveChat();
    if (!chat) return;

    if (!chat.username) {
        showToast('📞 اكتب "يوزر نيم الصديق" عند إضافة المحادثة لإجراء المكالمات');
        return;
    }
    if (!peer || !peer.open) {
        showToast('⏳ جاري الاتصال بالخادم... حاول مرة أخرى');
        return;
    }

    callType = type;
    callConnected = false;
    showOutgoingCallScreen(chat.name, chat.avatar, type);

    const constraints = type === 'video'
        ? { audio: true, video: { facingMode: 'user', width: 640, height: 480 } }
        : { audio: true, video: false };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            localStream = stream;
            const call = peer.call(chat.username, stream, {
                metadata: { type: type, name: myName, avatar: myAvatar, photo: myAvatarImg || '' }
            });
            currentCall = call;
            setupCallHandlers(call, chat);
            setupCallTimeout();
        })
        .catch(err => {
            console.log('Media error:', err);
            resetCallUI();
            showToast('🎤 تحتاج للسماح باستخدام الميكروفون');
        });
}

function setupCallTimeout() {
    clearTimeout(callTimeout);
    callTimeout = setTimeout(() => {
        if (!callConnected && currentCall) {
            const el = getCallElements();
            el.offlineNotice.classList.remove('hidden');
            endCallCleanup(true);
        }
    }, 30000);
}

// ===== استقبال المكالمات =====
function acceptCall() {
    stopRingtone();
    if (!incomingCall) return;

    const wantsVideo = incomingCallType === 'video';
    const constraints = wantsVideo
        ? { audio: true, video: { facingMode: 'user', width: 640, height: 480 } }
        : { audio: true, video: false };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            localStream = stream;
            incomingCall.answer(stream);
            currentCall = incomingCall;
            callType = incomingCallType;
            callConnected = false;
            const el = getCallElements();
            setupCallHandlers(currentCall, null);
            showActiveCallScreen(incomingCallName, incomingCallAvatar, callType);
            incomingCall = null;
        })
        .catch(err => {
            console.log('Media error accepting:', err);
            // محاولة الصوت فقط
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    localStream = stream;
                    incomingCall.answer(stream);
                    currentCall = incomingCall;
                    callType = 'audio';
                    callConnected = false;
                    setupCallHandlers(currentCall, null);
                    showActiveCallScreen(incomingCallName, incomingCallAvatar, 'audio');
                    incomingCall = null;
                })
                .catch(err2 => {
                    showToast('🎤 لا يمكن الوصول للميكروفون');
                    if (incomingCall) { try { incomingCall.close(); } catch (e) {} }
                    incomingCall = null;
                    hideCallScreen();
                });
        });
}

// ===== معالجات المكالمة =====
function setupCallHandlers(call, chat) {
    call.on('stream', (stream) => {
        callConnected = true;
        remoteStream = stream;
        clearTimeout(callTimeout);
        stopRingtone();
        const el = getCallElements();
        el.status.textContent = 'متصل الآن! 🎉';
        el.status.classList.remove('ringing');
        el.timer.classList.remove('hidden');

        el.remoteVideo.srcObject = stream;
        el.remoteVideo.play().catch(() => {});

        if (callType === 'video' && el.videoContainer.classList.contains('hidden')) {
            el.videoContainer.classList.remove('hidden');
            if (localStream) {
                el.localVideo.srcObject = localStream;
                el.localVideo.play().catch(() => {});
            }
        }

        startCallTimer();
        el.acceptBtn.classList.add('hidden');
    });

    call.on('close', () => {
        endCallCleanup(true);
    });

    call.on('error', (err) => {
        console.log('Call error:', err);
        endCallCleanup(true);
    });
}

// ===== أدوات التحكم بالمكالمة =====
function toggleMute() {
    if (!currentCall) return;
    isMuted = !isMuted;
    const el = getCallElements();
    if (localStream) {
        localStream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    }
    if (isMuted) {
        el.muteBtn.classList.add('muted');
        el.muteBtn.querySelector('.ctrl-icon').textContent = '🔇';
        showToast('🔇 صوتك في وضع الكتم');
    } else {
        el.muteBtn.classList.remove('muted');
        el.muteBtn.querySelector('.ctrl-icon').textContent = '🎙️';
    }
}

function toggleVideo() {
    if (!currentCall || callType !== 'video') return;
    isVideoOn = !isVideoOn;
    const el = getCallElements();
    if (localStream) {
        localStream.getVideoTracks().forEach(t => { t.enabled = isVideoOn; });
    }
    if (!isVideoOn) {
        el.videoBtn.classList.add('video-off');
        el.videoBtn.classList.remove('active');
        showToast('📹 تم إيقاف الفيديو');
    } else {
        el.videoBtn.classList.remove('video-off');
        el.videoBtn.classList.add('active');
        el.localVideo.classList.remove('hidden');
    }
}

function endCall() {
    stopRingtone();
    endCallCleanup(true);
}

function endCallCleanup(showMessage) {
    clearTimeout(callTimeout);
    stopCallTimer();
    stopRingtone();
    stopWeatherAnimation();

    if (currentCall) {
        try { currentCall.close(); } catch (e) {}
        currentCall = null;
    }
    if (incomingCall) {
        try { incomingCall.close(); } catch (e) {}
        incomingCall = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(t => t.stop());
        remoteStream = null;
    }

    const el = getCallElements();
    el.videoContainer.classList.add('hidden');
    el.localVideo.srcObject = null;
    el.remoteVideo.srcObject = null;

    hideCallScreen();

    isMuted = false;
    isVideoOn = true;
    callConnected = false;

    if (showMessage) {
        showToast('📞 انتهت المكالمة');
    }
}

function resetCallUI() {
    const el = getCallElements();
    el.screen.classList.add('hidden');
    el.acceptBtn.classList.add('hidden');
    el.offlineNotice.classList.add('hidden');
    stopWeatherAnimation();
}

function hideCallScreen() {
    getCallElements().screen.classList.add('hidden');
}

function startCallTimer() {
    stopCallTimer();
    callSeconds = 0;
    const timerEl = document.getElementById('call-timer');
    timerEl.textContent = '00:00';
    callTimer = setInterval(() => {
        callSeconds++;
        const m = Math.floor(callSeconds / 60).toString().padStart(2, '0');
        const s = (callSeconds % 60).toString().padStart(2, '0');
        timerEl.textContent = m + ':' + s;
    }, 1000);
}

function stopCallTimer() {
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
}

// إخفاء المكالمة عند تحريك الشاشة إذا كانت لا تزال تعرض (للسلامة)

// ===== رسائل التنبيه =====
let toastTimeout = null;
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    if (toastTimeout) clearTimeout(toastTimeout);

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ===== بدء التشغيل =====
document.addEventListener('DOMContentLoaded', init);