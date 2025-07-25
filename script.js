// Import Firebase services
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updatePassword
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    addDoc, 
    collection, 
    onSnapshot, 
    updateDoc, 
    deleteDoc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- FIREBASE CONFIG PLACEHOLDER ---
// Replace this with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbE0vki3JEwbl8Eqh20HPs5Rc542Bimmo",
  authDomain: "register-app-b43cc.firebaseapp.com",
  projectId: "register-app-b43cc",
  storageBucket: "register-app-b43cc.firebasestorage.app",
  messagingSenderId: "292558839859",
  appId: "1:292558839859:web:4c595352a75e57fd588346",
  measurementId: "G-03ZJW0B9LQ"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global App State
let currentUser = null;
let tasks = [];
let teams = [];
let editingTaskId = null;
let unsubscribeTasks = null;
let unsubscribeTeams = null;

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeCommandPalette();
    handleAuthState();
});

function handleAuthState() {
    // Show auth container by default while checking auth state
    showAuthContainer();
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    currentUser = { uid: user.uid, ...userDocSnap.data() };
                    showMainApp();
                    attachDataListeners();
                    applyTheme(currentUser.theme || 'nexus');
                } else {
                    console.error("User document not found in Firestore!");
                    showAuthContainer();
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                showAuthContainer();
            }
        } else {
            currentUser = null;
            if (unsubscribeTasks) unsubscribeTasks();
            if (unsubscribeTeams) unsubscribeTeams();
            showAuthContainer();
        }
    });
}

function showAuthContainer() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('main-app').classList.remove('flex');
}

function showMainApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('main-app').classList.add('flex');
    updateUserUI();
}

// --- DATA LISTENERS ---

function attachDataListeners() {
    if (!currentUser) return;

    if (unsubscribeTasks) unsubscribeTasks();
    if (unsubscribeTeams) unsubscribeTeams();

    const tasksCollectionRef = collection(db, `users/${currentUser.uid}/tasks`);
    
    unsubscribeTasks = onSnapshot(tasksCollectionRef, (snapshot) => {
        tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort tasks client-side
        tasks.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return b.createdAt.seconds - a.createdAt.seconds;
            }
            return 0;
        });
        renderCurrentPage(); 
        updateStatistics();
        checkDeadlinesForNotifications();
    });

    const teamsCollectionRef = collection(db, `users/${currentUser.uid}/teams`);
    unsubscribeTeams = onSnapshot(teamsCollectionRef, (snapshot) => {
        teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if(document.getElementById('teams-page').offsetParent !== null) {
            loadTeams();
        }
        updateTeamSelect();
    });
}

function renderCurrentPage() {
    const activePage = document.querySelector('[id$="-page"]:not(.hidden)');
    if (!activePage) {
        loadTasks();
        return;
    }

    const pageId = activePage.id;
    if (pageId === 'dashboard-page') {
        loadTasks();
    } else if (pageId === 'calendar-page') {
        initCalendar();
    } else if (pageId === 'reports-page') {
        initReports();
    } else if (pageId === 'teams-page') {
        loadTeams();
    }
}

// --- AUTHENTICATION FUNCTIONS ---

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const newUser = {
            name,
            email,
            createdAt: serverTimestamp(),
            job: '',
            bio: '',
            avatar: '',
            theme: 'nexus'
        };
        await setDoc(doc(db, "users", user.uid), newUser);
        showToast('Account created successfully!', 'success');
    } catch (error) {
        console.error("Registration Error:", error);
        showToast(error.message, 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!validateLoginForm(email, password)) {
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Welcome back!', 'success');
    } catch (error) {
        console.error("Login Error:", error);
        console.error("Error Code:", error.code);
        
        // Handle specific error cases - ADD the new error code here
        if (error.code === 'auth/user-not-found' || 
            error.code === 'auth/invalid-credential' ||
            error.code === 'auth/invalid-login-credentials') {  // Add this line
            
            showToast('No account found with this email. Please sign up first.', 'error');
            // Auto-switch to registration form after 2 seconds
            setTimeout(() => {
                switchToRegisterForm();
            }, 2000);
            
        } else if (error.code === 'auth/wrong-password') {
            showToast('Incorrect password. Please try again.', 'error');
        } else if (error.code === 'auth/invalid-email') {
            showToast('Please enter a valid email address.', 'error');
        } else if (error.code === 'auth/too-many-requests') {
            showToast('Too many failed attempts. Please try again later.', 'error');
        } else {
            showToast('Login failed. Please check your credentials.', 'error');
        }
    }
}


function validateLoginForm(email, password) {
    if (!email || !password) {
        showToast('Please fill in all fields.', 'error');
        return false;
    }
    
    if (!email.includes('@')) {
        showToast('Please enter a valid email address.', 'error');
        return false;
    }
    
    return true;
}

function switchToRegisterForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const toggleBtn = document.getElementById('toggle-auth');
    const subtitle = document.getElementById('auth-subtitle');

    // Switch to register form
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    toggleBtn.textContent = "Already have an account? Sign in";
    subtitle.textContent = "Create a new account";
    
    // Pre-fill email if provided
    const loginEmail = document.getElementById('login-email').value;
    if (loginEmail) {
        document.getElementById('register-email').value = loginEmail;
    }
    
    // Focus on name field for better UX
    document.getElementById('register-name').focus();
}



async function handleSignOut() {
    try {
        await signOut(auth);
        showToast('Signed out successfully!', 'success');
    } catch (error) {
        console.error("Sign Out Error:", error);
        showToast(error.message, 'error');
    }
}

// --- UI & EVENT LISTENERS ---

function initializeEventListeners() {
    // Auth forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('toggle-auth').addEventListener('click', toggleAuthForm);

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Mobile menu
    document.getElementById('mobile-menu-button').addEventListener('click', toggleMobileMenu);
    document.getElementById('close-mobile-menu').addEventListener('click', toggleMobileMenu);
    
    // Settings navigation
    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
        btn.addEventListener('click', handleSettingsNavigation);
    });

    // Task management
    document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal());
    document.getElementById('close-modal').addEventListener('click', closeTaskModal);
    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);

    // Team management
    document.getElementById('add-team-btn')?.addEventListener('click', openTeamModal);
    document.getElementById('close-team-modal')?.addEventListener('click', closeTeamModal);
    document.getElementById('team-form')?.addEventListener('submit', handleTeamSubmit);
    document.getElementById('add-member-btn')?.addEventListener('click', addTeamMember);

    // User menu
    document.getElementById('user-menu').addEventListener('click', toggleUserDropdown);
    document.querySelectorAll('.user-menu-link').forEach(link => {
        link.addEventListener('click', handleUserMenuAction);
    });

    // Profile form
    document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
    document.getElementById('change-avatar-btn').addEventListener('click', () => {
        document.getElementById('avatar-upload').click();
    });
    document.getElementById('avatar-upload').addEventListener('change', handleAvatarChange);
    document.getElementById('account-form').addEventListener('submit', handleAccountUpdate);

    // Search
    document.getElementById('search-input').addEventListener('input', handleSearch);

    // Filters and sorting
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', handleSort);
    });
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', handleViewChange);
    });

    // Toast
    document.getElementById('close-toast').addEventListener('click', closeToast);

    // Modal close on outside click
    document.getElementById('task-modal').addEventListener('click', (e) => {
        if (e.target.id === 'task-modal') closeTaskModal();
    });
    document.getElementById('team-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'team-modal') closeTeamModal();
    });

    // Team color selection
    document.querySelectorAll('.team-color').forEach(btn => {
        btn.addEventListener('click', selectTeamColor);
    });
    
    // Theme selection
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const theme = e.currentTarget.dataset.theme;
            applyTheme(theme);
            if (currentUser) {
                const userDocRef = doc(db, "users", currentUser.uid);
                updateDoc(userDocRef, { theme: theme });
            }
            showToast(`Theme changed to ${theme}`, 'success');
        });
    });

    // Set default due date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('task-due-date').value = today;
}

function updateUserUI() {
    if (!currentUser) return;
    
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const userAvatarContainer = document.getElementById('user-avatar-container');
    userAvatarContainer.innerHTML = '';
    const profileAvatarContainer = document.getElementById('profile-avatar-container');
    profileAvatarContainer.innerHTML = '';

    if (currentUser.avatar) {
        const avatarImg = document.createElement('img');
        avatarImg.src = currentUser.avatar;
        avatarImg.className = 'w-full h-full rounded-full object-cover';
        userAvatarContainer.appendChild(avatarImg.cloneNode(true));
        profileAvatarContainer.appendChild(avatarImg);
    } else {
        const initialsSpan = document.createElement('span');
        initialsSpan.className = 'font-bold text-white';
        initialsSpan.textContent = initials;
        userAvatarContainer.appendChild(initialsSpan);

        const profileInitialsSpan = document.createElement('span');
        profileInitialsSpan.id = 'profile-initials';
        profileInitialsSpan.textContent = initials;
        profileAvatarContainer.appendChild(profileInitialsSpan);
    }

    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('welcome-message').innerHTML = 
        `Welcome back, ${currentUser.name.split(' ')[0]}! You have <span id="task-count">0</span> tasks to complete`;
    
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-email-input').value = currentUser.email;
    document.getElementById('profile-fullname').value = currentUser.name;
    document.getElementById('profile-job').value = currentUser.job || '';
    document.getElementById('profile-bio').value = currentUser.bio || '';
    document.getElementById('account-created').textContent = currentUser.createdAt?.toDate().toLocaleDateString() || 'N/A';
    document.getElementById('last-active').textContent = 'Today';
    
    document.getElementById('settings-email').value = currentUser.email;
}

// --- CORE APP LOGIC (CRUD) ---

async function handleTaskSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;
    
    const formData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        priority: document.getElementById('task-priority').value,
        status: document.getElementById('task-status').value,
        dueDate: document.getElementById('task-due-date').value,
        teamId: document.getElementById('task-team').value || null,
        updatedAt: serverTimestamp()
    };

    try {
        if (editingTaskId) {
            const taskDocRef = doc(db, `users/${currentUser.uid}/tasks`, editingTaskId);
            await updateDoc(taskDocRef, formData);
            showToast('Task updated successfully!', 'success');
        } else {
            const tasksCollectionRef = collection(db, `users/${currentUser.uid}/tasks`);
            await addDoc(tasksCollectionRef, { ...formData, createdAt: serverTimestamp() });
            showToast('Task created successfully!', 'success');
        }
    } catch (error) {
        console.error("Task submission error:", error);
        showToast(error.message, 'error');
    }

    closeTaskModal();
}

async function deleteTask(taskId) {
    if (!currentUser) return;
    if (confirm('Are you sure you want to delete this task?')) {
        try {
            const taskDocRef = doc(db, `users/${currentUser.uid}/tasks`, taskId);
            await deleteDoc(taskDocRef);
            showToast('Task has been deleted', 'success');
        } catch (error) {
            console.error("Delete task error:", error);
            showToast(error.message, 'error');
        }
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    if (!currentUser) return;

    const updatedProfile = {
        name: document.getElementById('profile-fullname').value,
        email: document.getElementById('profile-email-input').value,
        job: document.getElementById('profile-job').value,
        bio: document.getElementById('profile-bio').value,
    };

    try {
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, updatedProfile);
        currentUser = { ...currentUser, ...updatedProfile };
        updateUserUI();
        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        console.error("Profile update error:", error);
        showToast(error.message, 'error');
    }
}

async function handleAccountUpdate(e) {
    e.preventDefault();
    const newPassword = document.getElementById('settings-password').value;
    const confirmPassword = document.getElementById('settings-confirm-password').value;

    if (newPassword && newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (newPassword) {
        try {
            await updatePassword(auth.currentUser, newPassword);
            showToast('Password updated successfully!', 'success');
            document.getElementById('account-form').reset();
            document.getElementById('settings-email').value = currentUser.email;
        } catch (error) {
            console.error("Password update error:", error);
            showToast("Error updating password. You may need to sign in again.", 'error');
        }
    }
}

// --- MISSING FUNCTIONS ---

function applyTheme(theme) {
    // Remove existing theme classes
    document.body.classList.remove('nexus-theme', 'ocean-theme', 'sunset-theme', 'emerald-theme');
    
    // Apply new theme
    if (theme) {
        document.body.classList.add(`${theme}-theme`);
    } else {
        document.body.classList.add('nexus-theme');
    }
}

function openTeamModal() {
    const modal = document.getElementById('team-modal');
    const modalContent = document.getElementById('team-modal-content');
    
    if (!modal || !modalContent) return;
    
    document.getElementById('team-form').reset();
    document.querySelector('.team-color.active')?.classList.remove('active');
    document.querySelector('.team-color[data-color="blue"]').classList.add('active');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeTeamModal() {
    const modal = document.getElementById('team-modal');
    const modalContent = document.getElementById('team-modal-content');
    
    if (!modal || !modalContent) return;
    
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.getElementById('team-form').reset();
    }, 300);
}

function addTeamMember() {
    const emailInput = document.getElementById('member-email');
    const membersContainer = document.getElementById('team-members');
    const email = emailInput.value.trim();
    
    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    const memberElement = document.createElement('div');
    memberElement.className = 'flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2';
    memberElement.innerHTML = `
        <span class="text-sm text-gray-200">${email}</span>
        <button type="button" class="text-red-400 hover:text-red-300 remove-member-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    memberElement.querySelector('.remove-member-btn').addEventListener('click', () => {
        memberElement.remove();
    });
    
    membersContainer.appendChild(memberElement);
    emailInput.value = '';
}

function selectTeamColor(e) {
    document.querySelectorAll('.team-color').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const taskCards = document.querySelectorAll('.task-card');
    
    taskCards.forEach(card => {
        const title = card.querySelector('h4').textContent.toLowerCase();
        const description = card.querySelector('p').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function handleFilter(e) {
    const status = e.target.dataset.status;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-gray-800', 'text-gray-300', 'active');
        btn.classList.add('text-gray-400');
    });
    
    e.target.classList.add('bg-gray-800', 'text-gray-300', 'active');
    e.target.classList.remove('text-gray-400');
    
    const taskCards = document.querySelectorAll('.task-card');
    taskCards.forEach(card => {
        if (status === 'all' || card.dataset.status === status) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function handleSort(e) {
    const sortBy = e.target.dataset.sort;
    
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('bg-gray-800', 'text-gray-300', 'active');
        btn.classList.add('text-gray-400');
    });
    
    e.target.classList.add('bg-gray-800', 'text-gray-300', 'active');
    e.target.classList.remove('text-gray-400');
    
    loadTasks();
}

function handleViewChange(e) {
    const view = e.target.dataset.view;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('bg-gray-800', 'active');
    });
    
    e.target.classList.add('bg-gray-800', 'active');
    
    const columnsContainer = document.getElementById('columns-container');
    const listContainer = document.getElementById('list-container');
    
    if (view === 'list') {
        columnsContainer.classList.add('hidden');
        listContainer.classList.remove('hidden');
        renderListView();
    } else {
        columnsContainer.classList.remove('hidden');
        listContainer.classList.add('hidden');
    }
}

function renderListView() {
    const container = document.getElementById('list-container');
    container.innerHTML = '';
    
    tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-list-item glass-panel p-4 rounded-xl flex items-center justify-between';
        taskElement.innerHTML = `
            <div class="flex items-center space-x-4">
                <div class="w-3 h-3 rounded-full bg-${task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'blue'}-500"></div>
                <div>
                    <h4 class="font-medium text-gray-100">${task.title}</h4>
                    <p class="text-sm text-gray-400">${task.description || 'No description'}</p>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-500">${new Date(task.dueDate).toLocaleDateString()}</span>
                <span class="status-badge bg-${task.status === 'completed' ? 'green' : task.status === 'progress' ? 'yellow' : 'blue'}-500/20 text-${task.status === 'completed' ? 'green' : task.status === 'progress' ? 'yellow' : 'blue'}-400">
                    ${task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </span>
                <button class="text-gray-400 hover:text-gray-200" onclick="openTaskModal(${JSON.stringify(task).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;
        container.appendChild(taskElement);
    });
}

function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            showToast('Avatar upload feature needs implementation', 'info');
        };
        reader.readAsDataURL(file);
    }
}

function initializeCommandPalette() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            toggleCommandPalette();
        }
        if (e.key === 'Escape') {
            closeCommandPalette();
        }
    });
}

function toggleCommandPalette() {
    const palette = document.getElementById('command-palette');
    if (palette.classList.contains('hidden')) {
        openCommandPalette();
    } else {
        closeCommandPalette();
    }
}

function openCommandPalette() {
    const palette = document.getElementById('command-palette');
    palette.classList.remove('hidden');
    palette.classList.add('flex');
    document.getElementById('command-input').focus();
}

function closeCommandPalette() {
    const palette = document.getElementById('command-palette');
    palette.classList.add('hidden');
    palette.classList.remove('flex');
    document.getElementById('command-input').value = '';
}

// --- NOTIFICATION LOGIC ---

function checkDeadlinesForNotifications() {
    if (!tasks || tasks.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

    let upcomingTasks = [];

    tasks.forEach(task => {
        if (task.status === 'completed') return;

        const dueDate = new Date(task.dueDate + 'T00:00:00');
        
        if (dueDate.getTime() === today.getTime()) {
            upcomingTasks.push({ task, message: `Task "${task.title}" is due today!` });
        } else if (dueDate.getTime() === twoDaysFromNow.getTime()) {
            upcomingTasks.push({ task, message: `Task "${task.title}" is due in 2 days.` });
        }
    });

    const notificationBadge = document.getElementById('notification-badge');
    if (upcomingTasks.length > 0) {
        notificationBadge.textContent = upcomingTasks.length;
        notificationBadge.classList.remove('hidden');
        showToast(upcomingTasks[0].message, 'info');
    } else {
        notificationBadge.classList.add('hidden');
    }
}

// --- UTILITY & OTHER FUNCTIONS ---

function loadTasks() {
    document.getElementById('todo-tasks').innerHTML = '';
    document.getElementById('progress-tasks').innerHTML = '';
    document.getElementById('completed-tasks').innerHTML = '';

    tasks.forEach(createTaskElement);

    updateTaskCounts();
    initializeDragAndDrop();
    
    if (!document.getElementById('list-container').classList.contains('hidden')) {
        renderListView();
    }
}

function createTaskElement(task) {
    const container = document.getElementById(`${task.status}-tasks`);
    if (!container) return;

    const taskElement = document.createElement('div');
    taskElement.className = 'task-card neumorphic rounded-2xl p-4 flip-card';
    taskElement.setAttribute('data-task-id', task.id);
    taskElement.setAttribute('data-priority', task.priority);
    taskElement.setAttribute('data-status', task.status);
    taskElement.setAttribute('data-deadline', task.dueDate);

    const priorityColors = {
        low: 'bg-blue-500/20 text-blue-400',
        medium: 'bg-yellow-500/20 text-yellow-400',
        high: 'bg-red-500/20 text-red-400',
        critical: 'bg-purple-500/20 text-purple-400'
    };

    const priorityColor = priorityColors[task.priority] || priorityColors.medium;
    const isCompleted = task.status === 'completed';
    
    const dueDate = new Date(task.dueDate + 'T00:00:00');
    const isOverdue = dueDate < new Date() && !isCompleted;
    
    const formattedDate = dueDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });

    const team = teams.find(t => t.id === task.teamId);
    const teamBadge = team ? `<span class="status-badge bg-${team.color}-500/20 text-${team.color}-400">${team.name}</span>` : '';

    taskElement.innerHTML = `
        <div class="flip-card-inner">
            <div class="flip-card-front ${isCompleted ? 'opacity-80' : ''}">
                <button class="absolute top-3 right-3 text-gray-400 hover:text-gray-200 toggle-details">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="flex justify-between items-start pr-8">
                    <div>
                        <h4 class="font-semibold text-gray-100 ${isCompleted ? 'line-through' : ''}">${task.title}</h4>
                        <p class="text-sm ${isCompleted ? 'text-gray-500' : 'text-gray-400'} mt-1">${task.description || 'No description'}</p>
                    </div>
                </div>
                <div class="flex justify-between items-center mt-4">
                    <div class="flex space-x-2">
                        <span class="status-badge ${priorityColor}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                        ${teamBadge}
                        ${isCompleted ? '<span class="status-badge bg-green-500/20 text-green-400">Done</span>' : ''}
                    </div>
                    <div class="text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'}">
                        <i class="far fa-calendar mr-1"></i> ${formattedDate}
                    </div>
                </div>
            </div>
            <div class="flip-card-back">
                <h4 class="font-semibold text-gray-100 mb-2">${task.title}</h4>
                <p class="text-xs text-gray-400 mb-4">${task.description || 'No description'}</p>
                <div class="flex space-x-2 mb-4">
                    <button class="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 py-1.5 rounded-lg text-sm edit-task-btn">
                        <i class="fas fa-edit mr-1"></i> Edit
                    </button>
                    <button class="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-1.5 rounded-lg text-sm delete-task-btn">
                        <i class="fas fa-trash mr-1"></i> Delete
                    </button>
                </div>
                <div class="text-xs text-gray-500 flex justify-between">
                    <span><i class="far fa-calendar mr-1"></i> Due ${formattedDate}</span>
                    <span><i class="fas fa-tag mr-1"></i> ${task.priority}</span>
                </div>
            </div>
        </div>
    `;

    taskElement.querySelector('.toggle-details').addEventListener('click', (e) => {
        e.stopPropagation();
        taskElement.classList.toggle('active');
        const icon = taskElement.querySelector('.toggle-details i');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
    });

    taskElement.querySelector('.edit-task-btn').addEventListener('click', () => openTaskModal(task));
    taskElement.querySelector('.delete-task-btn').addEventListener('click', () => deleteTask(task.id));

    container.appendChild(taskElement);
}

function initializeDragAndDrop() {
    const columns = ['todo-tasks', 'progress-tasks', 'completed-tasks'];
    
    columns.forEach(columnId => {
        const column = document.getElementById(columnId);
        if (!column) return;

        new Sortable(column, {
            group: 'tasks',
            animation: 150,
            ghostClass: 'opacity-50',
            onEnd: async function(evt) {
                const taskId = evt.item.dataset.taskId;
                const newStatus = evt.to.id.replace('-tasks', '');
                
                const task = tasks.find(t => t.id === taskId);
                if (task && task.status !== newStatus) {
                    try {
                        const taskDocRef = doc(db, `users/${currentUser.uid}/tasks`, taskId);
                        await updateDoc(taskDocRef, { 
                            status: newStatus,
                            updatedAt: serverTimestamp()
                        });
                        showToast(`Task moved to ${newStatus.replace('progress', 'in progress')}`, 'success');
                    } catch (error) {
                        console.error("Task status update error:", error);
                        showToast(error.message, 'error');
                        loadTasks();
                    }
                }
            }
        });
    });
}

function handleUserMenuAction(e) {
    e.preventDefault();
    const action = e.target.closest('a').dataset.action;
    
    switch (action) {
        case 'profile':
        case 'settings':
            handleNavigation(e);
            break;
        case 'signout':
            if (confirm('Are you sure you want to sign out?')) {
                handleSignOut();
            }
            break;
    }
    
    document.getElementById('user-dropdown').classList.add('hidden');
    document.getElementById('mobile-menu').classList.remove('active');
}

function toggleAuthForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const toggleBtn = document.getElementById('toggle-auth');
    const subtitle = document.getElementById('auth-subtitle');

    if (loginForm.classList.contains('hidden')) {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        toggleBtn.textContent = "Don't have an account? Sign up";
        subtitle.textContent = "Sign in to your account";
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        toggleBtn.textContent = "Already have an account? Sign in";
        subtitle.textContent = "Create a new account";
    }
}

function handleNavigation(e) {
    e.preventDefault();
    const page = e.target.dataset.page || e.target.closest('a').dataset.action;
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('text-primary-300', 'font-bold');
        link.classList.add('text-gray-400', 'font-medium');
    });
    
    const navButton = document.querySelector(`.nav-link[data-page="${page}"]`);
    if(navButton) {
        navButton.classList.add('text-primary-300', 'font-bold');
        navButton.classList.remove('text-gray-400', 'font-medium');
    }

    document.querySelectorAll('[id$="-page"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(`${page}-page`).classList.remove('hidden');

    renderCurrentPage();
    
    if(document.getElementById('mobile-menu').classList.contains('active')) {
        toggleMobileMenu();
    }
}

function handleSettingsNavigation(e) {
    const section = e.currentTarget.dataset.section;
    
    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
        btn.classList.remove('bg-gray-800');
    });
    e.currentTarget.classList.add('bg-gray-800');
    
    document.querySelectorAll('.settings-section').forEach(sec => {
        sec.classList.add('hidden');
    });
    document.getElementById(`settings-${section}`).classList.remove('hidden');
}

function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('active');
}

function openTaskModal(taskData = null) {
    editingTaskId = taskData ? taskData.id : null;
    const modal = document.getElementById('task-modal');
    const modalContent = document.getElementById('modal-content');
    const title = document.getElementById('modal-title');
    const submitText = document.getElementById('submit-text');

    if (taskData) {
        title.textContent = 'Edit Task';
        submitText.textContent = 'Update Task';
        document.getElementById('task-title').value = taskData.title;
        document.getElementById('task-description').value = taskData.description || '';
        document.getElementById('task-priority').value = taskData.priority;
        document.getElementById('task-status').value = taskData.status;
        document.getElementById('task-due-date').value = taskData.dueDate;
        document.getElementById('task-team').value = taskData.teamId || '';
    } else {
        title.textContent = 'Create New Task';
        submitText.textContent = 'Create Task';
        document.getElementById('task-form').reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('task-due-date').value = today;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    const modalContent = document.getElementById('modal-content');
    
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.getElementById('task-form').reset();
        editingTaskId = null;
    }, 300);
}

function updateTaskCounts() {
    const todoCount = tasks.filter(t => t.status === 'todo').length;
    const progressCount = tasks.filter(t => t.status === 'progress').length;
    const completedCount = tasks.filter(t => t.status === 'completed').length;

    document.getElementById('todo-count').textContent = todoCount;
    document.getElementById('progress-count').textContent = progressCount;
    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('task-count').textContent = todoCount + progressCount;
}

function updateStatistics() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => 
        new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const recentCompletedTasks = tasks.filter(t => 
        t.status === 'completed' && t.updatedAt?.toDate() >= lastWeek
    ).length;
    const productivity = totalTasks > 0 ? Math.round((recentCompletedTasks / totalTasks) * 100) : 0;

    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('completed-tasks-count').textContent = completedTasks;
    document.getElementById('overdue-tasks-count').textContent = overdueTasks;
    document.getElementById('productivity-score').textContent = `${productivity}%`;

    const completedPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const overduePercentage = totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0;

    document.getElementById('total-progress').textContent = `${completedPercentage}%`;
    document.getElementById('completed-progress').textContent = `${completedPercentage}%`;
    document.getElementById('overdue-progress').textContent = `${overduePercentage}%`;
    document.getElementById('productivity-change').textContent = `+${productivity}%`;

    document.getElementById('total-bar').style.width = `${completedPercentage}%`;
    document.getElementById('completed-bar').style.width = `${completedPercentage}%`;
    document.getElementById('overdue-bar').style.width = `${overduePercentage}%`;
    document.getElementById('productivity-bar').style.width = `${productivity}%`;
}

function toggleUserDropdown() {
    document.getElementById('user-dropdown').classList.toggle('hidden');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');

    const icons = {
        success: 'fas fa-check-circle text-green-400',
        error: 'fas fa-exclamation-circle text-red-400',
        info: 'fas fa-info-circle text-blue-400'
    };
    const titles = { success: 'Success', error: 'Error', info: 'Info' };

    toastIcon.className = `${icons[type]} text-xl`;
    toastTitle.textContent = titles[type];
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function closeToast() {
    document.getElementById('toast').classList.add('hidden');
}

async function handleTeamSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;
    
    const name = document.getElementById('team-name').value;
    const color = document.querySelector('.team-color.active').dataset.color;
    const memberElements = document.querySelectorAll('#team-members .flex');
    const members = Array.from(memberElements).map(el => el.querySelector('span').textContent);

    const newTeam = {
        name,
        color,
        members: [currentUser.email, ...members],
        createdAt: serverTimestamp()
    };

    try {
        const teamsCollectionRef = collection(db, `users/${currentUser.uid}/teams`);
        await addDoc(teamsCollectionRef, newTeam);
        showToast('Team created successfully!', 'success');
        closeTeamModal();
    } catch (error) {
        console.error("Team creation error:", error);
        showToast(error.message, 'error');
    }
}

function loadTeams() {
    const container = document.getElementById('teams-container');
    container.innerHTML = '';
    teams.forEach(createTeamElement);
    updateTeamSelect();
}

function createTeamElement(team) {
    const container = document.getElementById('teams-container');
    
    const teamElement = document.createElement('div');
    teamElement.className = 'neumorphic rounded-2xl p-5';
    teamElement.innerHTML = `
        <div class="flex items-center mb-4">
            <div class="w-12 h-12 rounded-full bg-gradient-to-r from-${team.color}-500 to-${team.color}-600 flex items-center justify-center text-white text-xl font-bold mr-3">
                ${team.name.charAt(0).toUpperCase()}
            </div>
            <div>
                <h3 class="font-semibold text-gray-100">${team.name}</h3>
                <p class="text-sm text-gray-400">${team.members.length} members</p>
            </div>
        </div>
        <div class="flex -space-x-2 mb-4">
            ${team.members.slice(0, 4).map(member => `
                <div class="w-8 h-8 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center text-xs text-white border-2 border-gray-900" title="${member}">
                    ${member.split('@')[0].charAt(0).toUpperCase()}
                </div>
            `).join('')}
            ${team.members.length > 4 ? `
                <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white border-2 border-gray-900">
                    +${team.members.length - 4}
                </div>
            ` : ''}
        </div>
        <div class="flex justify-between">
            <button class="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg invite-member-btn">
                <i class="fas fa-user-plus mr-1"></i> Invite
            </button>
            <button class="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg delete-team-btn">
                <i class="fas fa-trash mr-1"></i> Delete
            </button>
        </div>
    `;

    teamElement.querySelector('.invite-member-btn').addEventListener('click', async () => {
        const email = prompt('Enter member email to invite:');
        if (email && email.includes('@') && !team.members.includes(email)) {
            const teamDocRef = doc(db, `users/${currentUser.uid}/teams`, team.id);
            await updateDoc(teamDocRef, {
                members: [...team.members, email]
            });
            showToast('Member invited!', 'success');
        }
    });

    teamElement.querySelector('.delete-team-btn').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete team "${team.name}"?`)) {
            const teamDocRef = doc(db, `users/${currentUser.uid}/teams`, team.id);
            await deleteDoc(teamDocRef);
            showToast('Team deleted.', 'success');
        }
    });

    container.appendChild(teamElement);
}

function updateTeamSelect() {
    const select = document.getElementById('task-team');
    select.innerHTML = '<option value="">No Team</option>';
    
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        select.appendChild(option);
    });
}

function initCalendar() {
    const calendarGrid = document.querySelector('.calendar-grid');
    const monthYear = document.getElementById('calendar-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    let currentDate = new Date();

    const renderCalendar = (date) => {
        date.setDate(1);
        const month = date.getMonth();
        const year = date.getFullYear();
        monthYear.textContent = `${date.toLocaleString('default', { month: 'long' })} ${year}`;
        
        const firstDayIndex = date.getDay();
        const lastDay = new Date(year, month + 1, 0);
        const lastDayIndex = lastDay.getDay();
        const lastDayDate = lastDay.getDate();
        const prevLastDay = new Date(year, month, 0).getDate();
        const nextDays = 7 - lastDayIndex - 1;

        calendarGrid.innerHTML = '';
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'text-center text-gray-400 text-sm font-medium py-2';
            dayElement.textContent = day;
            calendarGrid.appendChild(dayElement);
        });

        for (let x = firstDayIndex; x > 0; x--) {
            const dayElement = document.createElement('div');
            dayElement.className = 'h-24 p-2 border border-gray-800 rounded-lg text-gray-600';
            dayElement.innerHTML = `<div class="text-right">${prevLastDay - x + 1}</div>`;
            calendarGrid.appendChild(dayElement);
        }

        for (let i = 1; i <= lastDayDate; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'h-24 p-2 border border-gray-700 rounded-lg relative';
            dayElement.innerHTML = `<div class="text-right text-sm font-medium">${i}</div>`;
            
            const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayTasks = tasks.filter(task => task.dueDate === dayDateStr);

            if (dayTasks.length > 0) {
                const tasksContainer = document.createElement('div');
                tasksContainer.className = 'mt-1 space-y-1';
                dayTasks.slice(0, 2).forEach(task => {
                    const taskElement = document.createElement('div');
                    taskElement.className = `text-xs px-2 py-1 rounded truncate bg-blue-500/20 text-blue-400`;
                    taskElement.textContent = task.title;
                    tasksContainer.appendChild(taskElement);
                });
                if (dayTasks.length > 2) {
                    const moreElement = document.createElement('div');
                    moreElement.className = 'mt-1 text-xs text-gray-500';
                    moreElement.textContent = `+${dayTasks.length - 2} more`;
                    tasksContainer.appendChild(moreElement);
                }
                dayElement.appendChild(tasksContainer);
            }

            const today = new Date();
            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayElement.classList.add('border-primary-500', 'bg-primary-500/10');
            }
            calendarGrid.appendChild(dayElement);
        }

        for (let j = 1; j <= nextDays; j++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'h-24 p-2 border border-gray-800 rounded-lg text-gray-600';
            dayElement.innerHTML = `<div class="text-right">${j}</div>`;
            calendarGrid.appendChild(dayElement);
        }
    };
    
    prevMonthBtn.onclick = () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    };
    nextMonthBtn.onclick = () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    };

    renderCalendar(currentDate);
}

function initReports() {
    if (window.tasksChart) window.tasksChart.destroy();
    if (window.priorityChart) window.priorityChart.destroy();

    const tasksCtx = document.getElementById('tasks-chart').getContext('2d');
    window.tasksChart = new Chart(tasksCtx, {
        type: 'doughnut',
        data: {
            labels: ['To Do', 'In Progress', 'Completed'],
            datasets: [{
                data: [
                    tasks.filter(t => t.status === 'todo').length,
                    tasks.filter(t => t.status === 'progress').length,
                    tasks.filter(t => t.status === 'completed').length
                ],
                backgroundColor: ['rgba(59, 130, 246, 0.8)','rgba(234, 179, 8, 0.8)','rgba(16, 185, 129, 0.8)'],
                borderColor: ['rgba(59, 130, 246, 1)','rgba(234, 179, 8, 1)','rgba(16, 185, 129, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#e2e8f0', font: { size: 12 }}},
                title: { display: true, text: 'Tasks by Status', color: '#e2e8f0', font: { size: 16 }}
            }
        }
    });

    const priorityCtx = document.getElementById('priority-chart').getContext('2d');
    window.priorityChart = new Chart(priorityCtx, {
        type: 'bar',
        data: {
            labels: ['Low', 'Medium', 'High', 'Critical'],
            datasets: [{
                label: 'Tasks by Priority',
                data: [
                    tasks.filter(t => t.priority === 'low').length,
                    tasks.filter(t => t.priority === 'medium').length,
                    tasks.filter(t => t.priority === 'high').length,
                    tasks.filter(t => t.priority === 'critical').length
                ],
                backgroundColor: ['rgba(59, 130, 246, 0.6)','rgba(163, 230, 53, 0.6)','rgba(249, 115, 22, 0.6)','rgba(220, 38, 38, 0.6)'],
                borderColor: ['rgba(59, 130, 246, 1)','rgba(163, 230, 53, 1)','rgba(249, 115, 22, 1)','rgba(220, 38, 38, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Tasks by Priority', color: '#e2e8f0', font: { size: 16 }}
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255, 255, 255, 0.1)' }},
                x: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255, 255, 255, 0.1)' }}
            }
        }
    });
    updatePerformanceMetrics();
}

function updatePerformanceMetrics() {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    let totalCompletionTime = 0;
    completedTasks.forEach(task => {
        if (task.createdAt && task.updatedAt) {
            totalCompletionTime += task.updatedAt.toMillis() - task.createdAt.toMillis();
        }
    });
    const avgCompletionTime = completedTasks.length > 0 ? totalCompletionTime / completedTasks.length : 0;
    const avgDays = avgCompletionTime / (1000 * 60 * 60 * 24);
    document.getElementById('avg-completion').textContent = completedTasks.length > 0 ? `${avgDays.toFixed(1)} days` : 'N/A';
    
    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    document.getElementById('completion-rate').textContent = `${completionRate.toFixed(0)}%`;
}

// Password toggle functionality
function initializePasswordToggles() {
    // Login password toggle
    const loginToggle = document.getElementById('toggle-login-password');
    const loginPassword = document.getElementById('login-password');
    const loginEyeIcon = document.getElementById('login-eye-icon');

    if (loginToggle && loginPassword) {
        loginToggle.addEventListener('click', function() {
            togglePasswordVisibility(loginPassword, loginEyeIcon);
        });
    }

    // Register password toggle
    const registerToggle = document.getElementById('toggle-register-password');
    const registerPassword = document.getElementById('register-password');
    const registerEyeIcon = document.getElementById('register-eye-icon');

    if (registerToggle && registerPassword) {
        registerToggle.addEventListener('click', function() {
            togglePasswordVisibility(registerPassword, registerEyeIcon);
        });
    }
}

function togglePasswordVisibility(passwordField, eyeIcon) {
    if (passwordField.type === 'password') {
        // Show password
        passwordField.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        // Hide password
        passwordField.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePasswordToggles();
});
