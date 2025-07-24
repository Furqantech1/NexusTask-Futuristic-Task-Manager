# NexusTask - Futuristic Task Manager 🚀

NexusTask is a modern, fully responsive, and interactive task management web application designed with user productivity and UI aesthetics in mind. It supports user authentication, dynamic task handling, team collaboration, productivity tracking, and calendar integration — all powered through HTML, Tailwind CSS, and JavaScript.

## 🔧 Features

- 🔐 **User Authentication** (Email-based via Firebase + LocalStorage fallback)
- 📋 **Dynamic Task Management** (To Do, In Progress, Completed)
- 🏷️ **Priority & Deadline-based Sorting and Filtering**
- 👥 **Team Management** with Color Tags & Member Invites
- 📊 **Productivity Analytics** (Real-time Completion Rate, Overdue, Dynamic Performance Charts)
- 📆 **Calendar View** with Task Dates
- 🧾 **Profile & Settings Customization** (Avatar, Theme, Profile Updates)
- 🌗 **Dark & Light Theme Compatibility** (Tailwind-based)
- ⌨️ **Command Palette (`Ctrl + K`)** for Quick Navigation & Actions
- ☁️ **Firebase Integration** (Authentication + Realtime Database)

## 🛠️ Built With

- HTML5
- CSS3 (TailwindCSS + Custom Styles)
- JavaScript (Vanilla JS + Firebase SDK)
- Firebase (Authentication + Firestore Database)

## 🖥️ Preview

![NexusTask UI Screenshot](/Photos/Dashboard.png)

## 📂 Folder Structure

```
├── index.html           # Main HTML file
├── style.css            # Styling (Tailwind + custom glassmorphism + themes)
├── script.js            # Core functionality: auth, UI, tasks, teams, stats
├── firebase-config.js   # Firebase initialization and methods
├── command-palette.js   # Ctrl+K Command Palette logic
```

## 🚀 Getting Started

1. **Clone the Repo** or **Download the Files**:
    ```bash
    git clone https://github.com/yourusername/nexustask.git
    ```

2. **Configure Firebase**:
    - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
    - Enable **Email/Password Authentication**
    - Create a **Firestore database**
    - Add your Firebase config to `firebase-config.js`

3. **Open the `index.html` file** in your browser:
    - You can double-click or right-click > open with your browser.

4. **Use the App**:
    - Register/Login with Email (via Firebase)
    - Add/manage tasks and teams
    - Use Command Palette (`Ctrl + K`) for quick actions
    - View dynamic reports and update your profile

## ⚙️ Customization

- Modify `style.css` to change theme or layout.
- Edit `command-palette.js` to add new commands.
- Firebase config is modular — easily switch to another backend if needed.

## 🧠 Future Enhancements

- Google Calendar & OAuth2 Integration
- Notifications and Reminders
- Role-based Access for Teams
- Drag & Drop Task Reordering
- PWA (Progressive Web App) Support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

### 💡 Inspiration

Designed with productivity, clarity, and modern UI/UX principles in mind. Ideal for students, developers, and teams looking to manage daily tasks efficiently.