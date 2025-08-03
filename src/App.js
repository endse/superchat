import './App.css';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { useEffect, useRef, useState } from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';
import { motion } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';

import { FirebaseX } from '@awesome-cordova-plugins/firebase-x';

useEffect(() => {
  FirebaseX.getToken().then(token => {
    console.log("FCM Token:", token);
    // You can store this in Firestore to send messages to users
  });

  FirebaseX.onMessageReceived().subscribe(data => {
    console.log("Notification:", data);
    alert("New message: " + data.body);
  });
}, []);

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.notifyNewMessage = functions.firestore
  .document('messages/{msgId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();

    const payload = {
      notification: {
        title: `New message from ${message.displayName}`,
        body: message.text,
      },
      topic: 'chat',
    };

    await admin.messaging().send(payload);
  });

firebase.initializeApp({
  apiKey: "AIzaSyCu1wmp7tKlqc0MUodlolYJj_mDGatUX64",
  authDomain: "chat-app-aecde.firebaseapp.com",
  projectId: "chat-app-aecde",
  storageBucket: "chat-app-aecde.appspot.com",
  messagingSenderId: "1058189630080",
  appId: "1:1058189630080:web:9e7f4469f5a20add226465",
  measurementId: "G-BWED5XC8ZM",
});

const auth = firebase.auth();
const firestore = firebase.firestore();

function App() {
  const [user] = useAuthState(auth);
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme === "dark";
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div className={`app-container ${darkMode ? 'dark' : 'light'}`}>
      <header className="app-header sticky-header">
        <h1 className="app-title">SuperChat</h1>
        <button className="toggle-theme" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
      </header>
      <main>{user ? <ChatRoom /> : <SignIn />}</main>
    </div>
  );
}

function SignIn() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    try {
      let userCredential;
      if (isRegistering) {
        userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
      } else {
        userCredential = await auth.signInWithEmailAndPassword(email, password);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  };

  return (
    <div className="signin-container">
      <form onSubmit={handleEmailAuth} className="email-auth-form">
        {isRegistering && (
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">
          {isRegistering ? 'Register' : 'Sign In'}
        </button>
        <p onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Already have an account? Sign In' : 'New here? Register'}
        </p>
      </form>

      <button className="sign-in" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    </div>
  );
}



function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => auth.signOut()}>Sign Out</button>
  );
}

function ChatRoom() {
  const dummy = useRef();
  const messagesRef = firestore.collection('messages');
  const query = messagesRef.orderBy('createdAt').limit(50);
  const [messages] = useCollectionData(query, { idField: 'id' });

  const [formValue, setFormValue] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (dummy.current) {
      dummy.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const { uid, photoURL, displayName } = auth.currentUser;

    await messagesRef.add({
      text: formValue,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      photoURL,
      displayName,
    });

    setFormValue('');
  };

  return (
    <div className="chat-room">
      <div className="welcome">Welcome to the chat!</div>
      <div className="message-list">
        {messages && messages.map(msg => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChatMessage message={msg} />
          </motion.div>
        ))}
        <div ref={dummy}></div>
      </div>
      <form onSubmit={sendMessage} className="send-message-form">
        <input
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="Type your message 💬"
        />
        <button type="button" className="emoji-btn" onClick={() => setShowPicker(val => !val)}>
          😊
        </button>
        {showPicker && (
          <div className="emoji-picker">
            <EmojiPicker onEmojiClick={(emojiData) => setFormValue(val => val + emojiData.emoji)} theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'} />
          </div>
        )}
        <button type="submit" disabled={!formValue}>Send</button>
      </form>
      <SignOut />
    </div>
  );
}

function ChatMessage({ message }) {
  const { text, uid, photoURL, displayName, createdAt } = message;
  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (
    <div className={`message ${messageClass}`}>
      <img src={photoURL || 'https://api.dicebear.com/6.x/initials/svg?seed=U'} alt="avatar" />
      <div className="message-content">
        <p className="username">{displayName || 'Anonymous'}</p>
        <p className="text">{text}</p>
        <div className="footer">
          {createdAt?.seconds && (
            <span className="timestamp">
              {new Date(createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {messageClass === 'sent' && <span className="seen-status">✔️</span>}
        </div>
      </div>
    </div>
  );
}

export default App;
