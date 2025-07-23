 // App state
        let currentUser = null;
        let tasks = [];
        let teams = [];
        let editingTaskId = null;

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            initializeApp();
        });

        function initializeApp() {
            // Check if user is logged in
            const savedUser = localStorage.getItem('nexusTaskUser');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                loadUserData();
                showMainApp();
            } else {
                showAuthContainer();
            }// Initialize event listeners
            initializeEventListeners();
        }

        function showAuthContainer() {
            document.getElementById('auth-container').classList.remove('hidden');
            document.getElementById('main-app').classList.add('hidden');
        }

        function showMainApp() {
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            
            if (currentUser) {
                updateUserUI();
                loadTasks();
                loadTeams();
                updateStatistics();
            }
        }

        function updateUserUI() {
            if (currentUser) {
                const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
                document.getElementById('user-initials').textContent = initials;
                document.getElementById('user-name').textContent = currentUser.name;
                document.getElementById('welcome-message').innerHTML = 
                    `Welcome back, ${currentUser.name.split(' ')[0]}! You have <span id="task-count">0</span> tasks to complete`;
                
                // Update profile page
                document.getElementById('profile-initials').textContent = initials;
                document.getElementById('profile-name').textContent = currentUser.name;
                document.getElementById('profile-email').textContent = currentUser.email;
                document.getElementById('profile-email-input').value = currentUser.email;
                document.getElementById('profile-fullname').value = currentUser.name;
                document.getElementById('account-created').textContent = new Date(currentUser.createdAt).toLocaleDateString();
                document.getElementById('last-active').textContent = 'Today';
            }
        }

        // Authentication
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
            document.getElementById('add-task-btn').addEventListener('click', openTaskModal);
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

            // Search
            document.getElementById('search-input').addEventListener('input', handleSearch);

            // Filters and sorting
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', handleFilter);
            });
            document.querySelectorAll('.sort-btn').forEach(btn => {
                btn.addEventListener('click', handleSort);
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

            // Set default due date
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('task-due-date').value = today;
        }

        function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            // Get saved users
            const users = JSON.parse(localStorage.getItem('nexusTaskUsers') || '[]');
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                currentUser = user;
                localStorage.setItem('nexusTaskUser', JSON.stringify(currentUser));
                showToast('Welcome back!', 'success');
                showMainApp();
            } else {
                showToast('Invalid email or password', 'error');
            }
        }

        function handleRegister(e) {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;

            // Get saved users
            const users = JSON.parse(localStorage.getItem('nexusTaskUsers') || '[]');
            
            // Check if user already exists
            if (users.find(u => u.email === email)) {
                showToast('User already exists with this email', 'error');
                return;
            }

            // Create new user
            const newUser = {
                id: Date.now().toString(),
                name,
                email,
                password,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            localStorage.setItem('nexusTaskUsers', JSON.stringify(users));
            
            currentUser = newUser;
            localStorage.setItem('nexusTaskUser', JSON.stringify(currentUser));
            
            showToast('Account created successfully!', 'success');
            showMainApp();
        }

        function toggleAuthForm() {
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            const toggleBtn = document.getElementById('toggle-auth');
            const subtitle = document.getElementById('auth-subtitle');

            if (loginForm.classList.contains('hidden')) {
                // Show login form
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                toggleBtn.textContent = "Don't have an account? Sign up";
                subtitle.textContent = "Sign in to your account";
            } else {
                // Show register form
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                toggleBtn.textContent = "Already have an account? Sign in";
                subtitle.textContent = "Create a new account";
            }
        }// Navigation
        function handleNavigation(e) {
            e.preventDefault();
            const page = e.target.dataset.page;
            
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('text-primary-300');
                link.classList.add('text-gray-400');
            });
            e.target.classList.add('text-primary-300');
            e.target.classList.remove('text-gray-400');

            // Show selected page
            document.querySelectorAll('[id$="-page"]').forEach(p => p.classList.add('hidden'));
            document.getElementById(`${page}-page`).classList.remove('hidden');

            // Initialize page-specific features
            if (page === 'calendar') initCalendar();
            if (page === 'reports') initReports();
        }
        
        function handleSettingsNavigation(e) {
            const section = e.currentTarget.dataset.section;
            
            // Update active button
            document.querySelectorAll('.settings-nav-btn').forEach(btn => {
                btn.classList.remove('bg-gray-800');
            });
            e.currentTarget.classList.add('bg-gray-800');
            
            // Show selected section
            document.querySelectorAll('.settings-section').forEach(sec => {
                sec.classList.add('hidden');
            });
            document.getElementById(`settings-${section}`).classList.remove('hidden');
        }
        
        function toggleMobileMenu() {
            document.getElementById('mobile-menu').classList.toggle('active');
        }

        // Task management
        function loadUserData() {
            const userKey = `nexusTaskData_${currentUser.id}`;
            const userData = JSON.parse(localStorage.getItem(userKey) || '{}');
            
            tasks = userData.tasks || [];
            teams = userData.teams || [];
        }

        function saveUserData() {
            if (!currentUser) return;
            
            const userKey = `nexusTaskData_${currentUser.id}`;
            const userData = {
                tasks,
                teams,
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem(userKey, JSON.stringify(userData));
        }

        function loadTasks() {
            // Clear existing tasks
            document.getElementById('todo-tasks').innerHTML = '';
            document.getElementById('progress-tasks').innerHTML = '';
            document.getElementById('completed-tasks').innerHTML = '';

            // Load tasks from data
            tasks.forEach(task => {
                createTaskElement(task);
            });

            updateTaskCounts();
            initializeDragAndDrop();
        }

        function loadTeams() {
            const container = document.getElementById('teams-container');
            container.innerHTML = '';

            teams.forEach(team => {
                createTeamElement(team);
            });

            updateTeamSelect();
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
                
                // Fill form with task data
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
                document.getElementById('task-form').reset();
                editingTaskId = null;
            }, 300);
        }

        function handleTaskSubmit(e) {
            e.preventDefault();
            
            const formData = {
                title: document.getElementById('task-title').value,
                description: document.getElementById('task-description').value,
                priority: document.getElementById('task-priority').value,
                status: document.getElementById('task-status').value,
                dueDate: document.getElementById('task-due-date').value,
                teamId: document.getElementById('task-team').value || null
            };

            if (editingTaskId) {
                // Update existing task
                const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
                if (taskIndex !== -1) {
                    tasks[taskIndex] = { ...tasks[taskIndex], ...formData, updatedAt: new Date().toISOString() };
                    showToast('Task updated successfully!', 'success');
                }
            } else {
                // Create new task
                const newTask = {
                    id: Date.now().toString(),
                    ...formData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                tasks.push(newTask);
                showToast('Task created successfully!', 'success');
            }

            saveUserData();
            loadTasks();
            updateStatistics();
            closeTaskModal();
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
            const isOverdue = new Date(task.dueDate) < new Date() && !isCompleted;
            
            const formattedDate = new Date(task.dueDate).toLocaleDateString('en-US', { 
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

            // Add event listeners
            const toggleBtn = taskElement.querySelector('.toggle-details');
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                taskElement.classList.toggle('active');
                
                const icon = toggleBtn.querySelector('i');
                if (taskElement.classList.contains('active')) {
                    icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
                } else {
                    icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
                }
            });

            const editBtn = taskElement.querySelector('.edit-task-btn');
            editBtn.addEventListener('click', () => {
                openTaskModal(task);
            });

            const deleteBtn = taskElement.querySelector('.delete-task-btn');
            deleteBtn.addEventListener('click', () => {
                deleteTask(task.id);
            });

            container.appendChild(taskElement);
        }

        function deleteTask(taskId) {
            if (confirm('Are you sure you want to delete this task?')) {
                const taskIndex = tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    const task = tasks[taskIndex];
                    tasks.splice(taskIndex, 1);
                    saveUserData();
                    loadTasks();
                    updateStatistics();
                    showToast(`"${task.title}" has been deleted`, 'success');
                }
            }
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

            // Calculate productivity (completed tasks in last 7 days)
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            const recentCompletedTasks = tasks.filter(t => 
                t.status === 'completed' && new Date(t.updatedAt) >= lastWeek
            ).length;
            const productivity = totalTasks > 0 ? Math.round((recentCompletedTasks / totalTasks) * 100) : 0;

            // Update UI
            document.getElementById('total-tasks').textContent = totalTasks;
            document.getElementById('completed-tasks-count').textContent = completedTasks;
            document.getElementById('overdue-tasks-count').textContent = overdueTasks;
            document.getElementById('productivity-score').textContent = `${productivity}%`;

            // Update progress bars
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

        function initializeDragAndDrop() {
            const columns = ['todo-tasks', 'progress-tasks', 'completed-tasks'];
            
            columns.forEach(columnId => {
                const column = document.getElementById(columnId);
                if (!column) return;

                new Sortable(column, {
                    group: 'tasks',
                    animation: 150,
                    ghostClass: 'opacity-50',
                    onEnd: function(evt) {
                        const taskId = evt.item.dataset.taskId;
                        const newStatus = evt.to.id.replace('-tasks', '');
                        
                        // Update task status
                        const task = tasks.find(t => t.id === taskId);
                        if (task && task.status !== newStatus) {
                            task.status = newStatus;
                            task.updatedAt = new Date().toISOString();
                            
                            saveUserData();
                            loadTasks(); // Reload to update styling
                            updateStatistics();
                            
                            showToast(`Task moved to ${newStatus.replace('progress', 'in progress')}`, 'success');
                        }
                    }
                });
            });
        }

        // Team management
        function openTeamModal() {
            const modal = document.getElementById('team-modal');
            const modalContent = document.getElementById('team-modal-content');
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                modalContent.classList.remove('scale-95', 'opacity-0');
                modalContent.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        function closeTeamModal() {
            const modal = document.getElementById('team-modal');
            const modalContent = document.getElementById('team-modal-content');
            
            modalContent.classList.remove('scale-100', 'opacity-100');
            modalContent.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                modal.classList.add('hidden');
                document.getElementById('team-form').reset();
                document.getElementById('team-members').innerHTML = '';
                document.querySelector('.team-color.active')?.classList.remove('active');
                document.querySelector('.team-color[data-color="blue"]').classList.add('active');
            }, 300);
        }

        function selectTeamColor(e) {
            document.querySelectorAll('.team-color').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
        }

        function addTeamMember() {
            const emailInput = document.getElementById('member-email');
            const email = emailInput.value.trim();
            
            if (!email || !email.includes('@')) {
                showToast('Please enter a valid email address', 'error');
                return;
            }

            const membersContainer = document.getElementById('team-members');
            const memberElement = document.createElement('div');
            memberElement.className = 'flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2';
            memberElement.innerHTML = `
                <span class="text-sm text-gray-200">${email}</span>
                <button type="button" class="text-gray-500 hover:text-red-400 remove-member">
                    <i class="fas fa-times"></i>
                </button>
            `;

            memberElement.querySelector('.remove-member').addEventListener('click', () => {
                memberElement.remove();
            });

            membersContainer.appendChild(memberElement);
            emailInput.value = '';
        }

        function handleTeamSubmit(e) {
            e.preventDefault();
            
            const name = document.getElementById('team-name').value;
            const color = document.querySelector('.team-color.active').dataset.color;
            const memberElements = document.querySelectorAll('#team-members .flex');
            const members = Array.from(memberElements).map(el => el.querySelector('span').textContent);

            const newTeam = {
                id: Date.now().toString(),
                name,
                color,
                members: [currentUser.email, ...members],
                createdAt: new Date().toISOString()
            };

            teams.push(newTeam);
            saveUserData();
            loadTeams();
            closeTeamModal();
            showToast('Team created successfully!', 'success');
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
                    ${team.members.slice(0, 4).map((member, index) => `
                        <div class="w-8 h-8 rounded-full bg-gradient-to-r from-${team.color}-500 to-${team.color}-600 flex items-center justify-center text-xs text-white border-2 border-gray-900">
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
                    <button class="text-xs bg-gradient-to-r from-${team.color}-600 to-${team.color}-700 hover:from-${team.color}-700 hover:to-${team.color}-800 text-white px-3 py-1.5 rounded-lg delete-team-btn">
                        <i class="fas fa-trash mr-1"></i> Delete
                    </button>
                </div>
            `;

            // Add event listeners
            const inviteBtn = teamElement.querySelector('.invite-member-btn');
            inviteBtn.addEventListener('click', () => {
                const email = prompt('Enter member email:');
                if (email && email.includes('@')) {
                    team.members.push(email);
                    saveUserData();
                    loadTeams();
                    showToast('Member invited successfully!', 'success');
                }
            });

            const deleteBtn = teamElement.querySelector('.delete-team-btn');
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete team "${team.name}"?`)) {
                    const teamIndex = teams.findIndex(t => t.id === team.id);
                    if (teamIndex !== -1) {
                        teams.splice(teamIndex, 1);
                        saveUserData();
                        loadTeams();
                        updateTeamSelect();
                        showToast('Team deleted successfully!', 'success');
                    }
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

        // User menu
        function toggleUserDropdown() {
            const dropdown = document.getElementById('user-dropdown');
            dropdown.classList.toggle('hidden');
        }

        function handleUserMenuAction(e) {
            e.preventDefault();
            const action = e.target.closest('a').dataset.action;
            
            switch (action) {
                case 'profile':
                    document.querySelectorAll('[id$="-page"]').forEach(p => p.classList.add('hidden'));
                    document.getElementById('profile-page').classList.remove('hidden');
                    document.querySelector('.nav-link[data-page="dashboard"]').classList.remove('text-primary-300');
                    document.querySelector('.nav-link[data-page="dashboard"]').classList.add('text-gray-400');
                    break;
                case 'settings':
                    document.querySelectorAll('[id$="-page"]').forEach(p => p.classList.add('hidden'));
                    document.getElementById('settings-page').classList.remove('hidden');
                    document.querySelector('.nav-link[data-page="dashboard"]').classList.remove('text-primary-300');
                    document.querySelector('.nav-link[data-page="dashboard"]').classList.add('text-gray-400');
                    break;
                case 'signout':
                    if (confirm('Are you sure you want to sign out?')) {
                        localStorage.removeItem('nexusTaskUser');
                        currentUser = null;
                        tasks = [];
                        teams = [];
                        showToast('Signed out successfully!', 'success');
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                    break;
            }
            
            document.getElementById('user-dropdown').classList.add('hidden');
            document.getElementById('mobile-menu').classList.remove('active');
        }
        
        function handleProfileUpdate(e) {
            e.preventDefault();
            
            const name = document.getElementById('profile-fullname').value;
            const email = document.getElementById('profile-email-input').value;
            
            currentUser.name = name;
            currentUser.email = email;
            
            localStorage.setItem('nexusTaskUser', JSON.stringify(currentUser));
            updateUserUI();
            
            showToast('Profile updated successfully!', 'success');
        }

        // Search and filters
        function handleSearch(e) {
            const query = e.target.value.toLowerCase();
            const taskCards = document.querySelectorAll('.task-card');
            
            taskCards.forEach(card => {
                const title = card.querySelector('h4').textContent.toLowerCase();
                const description = card.querySelector('p').textContent.toLowerCase();
                
                if (title.includes(query) || description.includes(query)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        function handleFilter(e) {
            const status = e.target.dataset.status;
            
            // Update active filter button
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active', 'bg-gray-800', 'text-gray-300');
                btn.classList.add('text-gray-400');
            });
            e.target.classList.add('active', 'bg-gray-800', 'text-gray-300');
            e.target.classList.remove('text-gray-400');

            // Filter tasks
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
            
            // Update active sort button
            document.querySelectorAll('.sort-btn').forEach(btn => {
                btn.classList.remove('active', 'bg-gray-800', 'text-gray-300');
                btn.classList.add('text-gray-400');
            });
            e.target.classList.add('active', 'bg-gray-800', 'text-gray-300');
            e.target.classList.remove('text-gray-400');

            // Sort tasks
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            
            tasks.sort((a, b) => {
                switch (sortBy) {
                    case 'priority':
                        return priorityOrder[a.priority] - priorityOrder[b.priority];
                    case 'deadline':
                        return new Date(a.dueDate) - new Date(b.dueDate);
                    case 'newest':
                    default:
                        return new Date(b.createdAt) - new Date(a.createdAt);
                }
            });

            saveUserData();
            loadTasks();
        }

        // Toast notifications
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            const toastIcon = document.getElementById('toast-icon');
            const toastTitle = document.getElementById('toast-title');
            const toastMessage = document.getElementById('toast-message');

            // Set icon and title based on type
            switch (type) {
                case 'success':
                    toastIcon.className = 'fas fa-check-circle text-green-400 text-xl';
                    toastTitle.textContent = 'Success';
                    break;
                case 'error':
                    toastIcon.className = 'fas fa-exclamation-circle text-red-400 text-xl';
                    toastTitle.textContent = 'Error';
                    break;
                case 'info':
                    toastIcon.className = 'fas fa-info-circle text-blue-400 text-xl';
                    toastTitle.textContent = 'Info';
                    break;
            }

            toastMessage.textContent = message;
            toast.classList.remove('hidden');
            
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        }

        function closeToast() {
            document.getElementById('toast').classList.add('hidden');
        }

        // Calendar initialization
        function initCalendar() {
            const calendarGrid = document.querySelector('.calendar-grid');
            const monthYear = document.getElementById('calendar-month-year');
            const prevMonthBtn = document.getElementById('prev-month');
            const nextMonthBtn = document.getElementById('next-month');

            let currentDate = new Date();
            let currentMonth = currentDate.getMonth();
            let currentYear = currentDate.getFullYear();

            function renderCalendar() {
                calendarGrid.innerHTML = '';

                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

                // Day headers
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                dayNames.forEach(day => {
                    const dayElement = document.createElement('div');
                    dayElement.className = 'text-center text-gray-400 text-sm font-medium py-2';
                    dayElement.textContent = day;
                    calendarGrid.appendChild(dayElement);
                });

                const firstDay = new Date(currentYear, currentMonth, 1).getDay();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

                // Empty slots
                for (let i = 0; i < firstDay; i++) {
                    const emptyDay = document.createElement('div');
                    emptyDay.className = 'h-24';
                    calendarGrid.appendChild(emptyDay);
                }

                // Day cells with tasks
                for (let day = 1; day <= daysInMonth; day++) {
                    const dayElement = document.createElement('div');
                    dayElement.className = 'h-24 p-2 border border-gray-700 rounded-lg';

                    const dayNumber = document.createElement('div');
                    dayNumber.className = 'text-right text-sm font-medium';
                    dayNumber.textContent = day;
                    dayElement.appendChild(dayNumber);

                    // Find tasks for this day
                    const dayDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayTasks = tasks.filter(task => task.dueDate === dayDate);

                    dayTasks.slice(0, 2).forEach(task => {
                        const taskElement = document.createElement('div');
                        taskElement.className = `mt-1 text-xs px-2 py-1 rounded ${
                            task.priority === 'high' || task.priority === 'critical' 
                                ? 'bg-red-500/20 text-red-400' 
                                : 'bg-blue-500/20 text-blue-400'
                        }`;
                        taskElement.textContent = task.title.length > 15 ? task.title.substring(0, 15) + '...' : task.title;
                        dayElement.appendChild(taskElement);
                    });

                    if (dayTasks.length > 2) {
                        const moreElement = document.createElement('div');
                        moreElement.className = 'mt-1 text-xs text-gray-500';
                        moreElement.textContent = `+${dayTasks.length - 2} more`;
                        dayElement.appendChild(moreElement);
                    }

                    // Highlight today
                    const today = new Date();
                    if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                        dayElement.classList.add('border-primary-500', 'bg-primary-500/10');
                    }

                    calendarGrid.appendChild(dayElement);
                }
            }

            prevMonthBtn.addEventListener('click', () => {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar();
            });

            nextMonthBtn.addEventListener('click', () => {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar();
            });

            renderCalendar();
        }

        // Reports initialization
        function initReports() {
            // Tasks chart
            const tasksCtx = document.getElementById('tasks-chart').getContext('2d');
            new Chart(tasksCtx, {
                type: 'doughnut',
                data: {
                    labels: ['To Do', 'In Progress', 'Completed'],
                    datasets: [{
                        data: [
                            tasks.filter(t => t.status === 'todo').length,
                            tasks.filter(t => t.status === 'progress').length,
                            tasks.filter(t => t.status === 'completed').length
                        ],
                        backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(234, 179, 8, 0.8)',
                            'rgba(16, 185, 129, 0.8)'
                        ],
                        borderColor: [
                            'rgba(59, 130, 246, 1)',
                            'rgba(234, 179, 8, 1)',
                            'rgba(16, 185, 129, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#e2e8f0',
                                font: {
                                    size: 12
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: 'Tasks by Status',
                            color: '#e2e8f0',
                            font: {
                                size: 16
                            }
                        }
                    }
                }
            });

            // Priority chart
            const priorityCtx = document.getElementById('priority-chart').getContext('2d');
            new Chart(priorityCtx, {
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
                        backgroundColor: [
                            'rgba(59, 130, 246, 0.6)',
                            'rgba(163, 230, 53, 0.6)',
                            'rgba(249, 115, 22, 0.6)',
                            'rgba(220, 38, 38, 0.6)'
                        ],
                        borderColor: [
                            'rgba(59, 130, 246, 1)',
                            'rgba(163, 230, 53, 1)',
                            'rgba(249, 115, 22, 1)',
                            'rgba(220, 38, 38, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Tasks by Priority',
                            color: '#e2e8f0',
                            font: {
                                size: 16
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#a0aec0'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: '#a0aec0'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    }
                }
            });
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            const userMenu = document.getElementById('user-menu');
            const userDropdown = document.getElementById('user-dropdown');
            
            if (userMenu && !userMenu.contains(e.target) && userDropdown && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });