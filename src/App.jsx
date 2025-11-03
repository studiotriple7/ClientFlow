import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, User, Plus, LogOut, X, AlertCircle, Loader } from 'lucide-react';
import { auth, db, storage } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  onSnapshot,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function ClientUpdateApp() {
useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('✅ Service Worker registered'))
        .catch(err => console.log('❌ Service Worker failed:', err));
    }
  }, []);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [isSignup, setIsSignup] = useState(false);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', images: [] });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          type: user.email === 'anthony@studiotriple7.com' ? 'admin' : 'client'
        });
        setShowLogin(false);
      } else {
        setCurrentUser(null);
        setShowLogin(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = [];
      snapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() });
      });
      setTasks(tasksData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.type !== 'admin') return;

    const checkReminders = () => {
      const now = new Date();
      const fourHours = 4 * 60 * 60 * 1000;

      tasks.forEach(async (task) => {
        if (task.status === 'pending') {
          const lastReminder = task.lastReminder?.toDate ? task.lastReminder.toDate() : new Date(task.lastReminder);
          const timeSinceLastReminder = now - lastReminder;
          
          if (timeSinceLastReminder >= fourHours) {
            addNotification(`Reminder: "${task.title}" from ${task.clientName} needs attention`);
            const taskRef = doc(db, 'tasks', task.id);
            await updateDoc(taskRef, { lastReminder: Timestamp.now() });
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000);
    checkReminders();

    return () => clearInterval(interval);
  }, [tasks, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const addNotification = (message) => {
    const newNotif = { id: Date.now(), message, time: new Date() };
    setNotifications(prev => [newNotif, ...prev].slice(0, 10));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  const handleAuth = async () => {
    try {
      if (isSignup) {
        if (!formData.name || !formData.email || !formData.password) {
          alert('Please fill in all fields');
          return;
        }
        await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        addNotification(`Welcome ${formData.name}! Your account has been created.`);
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        addNotification(`Welcome back!`);
      }
      setFormData({ email: '', password: '', name: '' });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', images: [] });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + taskForm.images.length > 5) {
      alert('Maximum 5 images allowed per request');
      return;
    }

    files.forEach(file => {
      if (file.size > 5000000) {
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setTaskForm(prev => ({
          ...prev,
          images: [...prev.images, { file, url: event.target.result, name: file.name }]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setTaskForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const submitTask = async () => {
    if (!taskForm.title || !taskForm.description) {
      alert('Please fill in title and description');
      return;
    }

    setUploading(true);
    try {
      const imageUrls = [];
      
      for (const img of taskForm.images) {
        if (img.file) {
          const storageRef = ref(storage, `task-images/${Date.now()}-${img.file.name}`);
          await uploadBytes(storageRef, img.file);
          const url = await getDownloadURL(storageRef);
          imageUrls.push({ url, name: img.name });
        }
      }

      await addDoc(collection(db, 'tasks'), {
        clientId: currentUser.id,
        clientName: currentUser.name,
        title: taskForm.title,
        description: taskForm.description,
        images: imageUrls,
        status: 'pending',
        createdAt: Timestamp.now(),
        lastReminder: Timestamp.now()
      });

      setTaskForm({ title: '', description: '', images: [] });
      setShowTaskForm(false);
      addNotification(`New update request submitted: "${taskForm.title}"`);
    } catch (error) {
      alert('Error submitting task: ' + error.message);
    }
    setUploading(false);
  };

  const submitForReview = async (taskId) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { 
        status: 'pending_review', 
        submittedForReview: Timestamp.now()
      });
      const task = tasks.find(t => t.id === taskId);
      addNotification(`Task "${task.title}" submitted for ${task.clientName}'s review`);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const approveTask = async (taskId) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { 
        status: 'completed', 
        completedAt: Timestamp.now()
      });
      const task = tasks.find(t => t.id === taskId);
      addNotification(`Task "${task.title}" approved and completed!`);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const requestChanges = async (taskId) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { 
        status: 'pending', 
        lastReminder: Timestamp.now()
      });
      const task = tasks.find(t => t.id === taskId);
      addNotification(`Changes requested for "${task.title}" - back to in progress`);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      addNotification('Task deleted');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const getTimeSince = (date) => {
    if (!date) return 'just now';
    const timestamp = date.toDate ? date.toDate() : new Date(date);
    const minutes = Math.floor((new Date() - timestamp) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const reviewTasks = tasks.filter(t => t.status === 'pending_review');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="CFlow Logo" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">CFlow by ST7</h1>
            <p className="text-gray-600">Manage website updates efficiently</p>
          </div>

          <div className="space-y-4">
            {isSignup && (
              <input
                type="text"
                placeholder="Full Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <button
              onClick={handleAuth}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              {isSignup ? 'Sign Up' : 'Login'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {isSignup ? 'Already have an account? Login' : 'Need an account? Sign Up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Updates</h1>
            <p className="text-sm text-gray-600">
              {currentUser.type === 'admin' ? 'Admin Dashboard' : `Welcome, ${currentUser.name}`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {notifications.length > 0 && (
              <div className="relative notification-container">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative hover:bg-gray-100 p-2 rounded-lg transition"
                >
                  <Bell className="text-indigo-600" size={24} />
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <button
                        onClick={clearAllNotifications}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map(notif => (
                        <div key={notif.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition">
                          <p className="text-sm text-gray-900">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{getTimeSince(notif.time)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentUser.type === 'client' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                disabled={uploading}
              >
                {uploading ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />}
                {uploading ? 'Uploading...' : 'New Update Request'}
              </button>
            </div>

            {showTaskForm && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Submit Update Request</h2>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Update Title (e.g., Change homepage banner)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                  <textarea
                    placeholder="Describe the changes you need..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-32 resize-none"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload Images (Optional - Max 5 images, 5MB each)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  {taskForm.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {taskForm.images.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <X size={16} />
                          </button>
                          <p className="text-xs text-gray-500 mt-1 truncate">{img.name}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={submitTask}
                      disabled={uploading}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {uploading ? 'Submitting...' : 'Submit Request'}
                    </button>
                    <button
                      onClick={() => {
                        setShowTaskForm(false);
                        setTaskForm({ title: '', description: '', images: [] });
                      }}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Your Requests</h2>
              
              {tasks.filter(t => t.clientId === currentUser.id && t.status === 'pending_review').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <AlertCircle size={20} />
                    Ready for Your Review
                  </h3>
                  {tasks.filter(t => t.clientId === currentUser.id && t.status === 'pending_review').map(task => (
                    <div key={task.id} className="bg-blue-50 rounded-xl shadow-md p-6 border-2 border-blue-400 mb-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white">
                          Review Needed
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{task.description}</p>
                      
                      {task.images && task.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                          {task.images.map((img, index) => (
                            <img
                              key={index}
                              src={img.url}
                              alt={img.name}
                              className="w-full h-24 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-75 transition"
                              onClick={() => window.open(img.url, '_blank')}
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        <Clock size={16} />
                        Submitted for review {getTimeSince(task.submittedForReview)}
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <p className="text-sm font-semibold text-gray-700 mb-3">
                          Please review the completed work. Are you satisfied with the changes?
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => approveTask(task.id)}
                            className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={18} />
                            Approve & Complete
                          </button>
                          <button
                            onClick={() => requestChanges(task.id)}
                            className="flex-1 bg-yellow-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition"
                          >
                            Request Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tasks.filter(t => t.clientId === currentUser.id).length === 0 ? (
                <p className="text-gray-500">No requests yet. Click "New Update Request" to get started.</p>
              ) : (
                <div className="space-y-4">
                  {tasks.filter(t => t.clientId === currentUser.id && t.status !== 'pending_review').map(task => (
                    <div key={task.id} className="bg-white rounded-xl shadow-md p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {task.status === 'pending' ? 'In Progress' : 'Completed'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{task.description}</p>
                      
                      {task.images && task.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                          {task.images.map((img, index) => (
                            <img
                              key={index}
                              src={img.url}
                              alt={img.name}
                              className="w-full h-24 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-75 transition"
                              onClick={() => window.open(img.url, '_blank')}
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock size={16} />
                        {task.status === 'completed' ? `Completed ${getTimeSince(task.completedAt)}` : `Submitted ${getTimeSince(task.createdAt)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentUser.type === 'admin' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-yellow-100 p-2 rounded-lg">
                    <Clock className="text-yellow-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-700">In Progress</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">{pendingTasks.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <AlertCircle className="text-blue-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-700">Pending Review</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">{reviewTasks.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-700">Completed</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">{completedTasks.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <User className="text-purple-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-700">Total Clients</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">In Progress</h2>
              {pendingTasks.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-8 text-center mb-6">
                  <CheckCircle className="text-green-500 mx-auto mb-3" size={48} />
                  <p className="text-gray-500 text-lg">No tasks in progress!</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {pendingTasks.map(task => (
                    <div key={task.id} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                            <span className="text-sm text-gray-500">from {task.clientName}</span>
                          </div>
                          <p className="text-gray-600 mb-3">{task.description}</p>
                          
                          {task.images && task.images.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                              {task.images.map((img, index) => (
                                <img
                                  key={index}
                                  src={img.url}
                                  alt={img.name}
                                  className="w-full h-24 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-75 transition"
                                  onClick={() => window.open(img.url, '_blank')}
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock size={16} />
                              Submitted {getTimeSince(task.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Bell size={16} />
                              Last reminder {getTimeSince(task.lastReminder)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => submitForReview(task.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 whitespace-nowrap"
                          >
                            <CheckCircle size={18} />
                            Submit for Review
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {reviewTasks.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle size={24} className="text-blue-600" />
                  Awaiting Client Review
                </h2>
                <div className="space-y-4 mb-6">
                  {reviewTasks.map(task => (
                    <div key={task.id} className="bg-blue-50 rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                            <span className="text-sm text-gray-500">from {task.clientName}</span>
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
                              Waiting for approval
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3">{task.description}</p>
                          
                          {task.images && task.images.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                              {task.images.map((img, index) => (
                                <img
                                  key={index}
                                  src={img.url}
                                  alt={img.name}
                                  className="w-full h-24 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-75 transition"
                                  onClick={() => window.open(img.url, '_blank')}
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock size={16} />
                            Submitted for review {getTimeSince(task.submittedForReview)}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Completed Updates</h2>
                <div className="space-y-4">
                  {completedTasks.map(task => (
                    <div key={task.id} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500 opacity-75">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                            <span className="text-sm text-gray-500">from {task.clientName}</span>
                          </div>
                          <p className="text-gray-600 mb-3">{task.description}</p>
                          
                          {task.images && task.images.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                              {task.images.map((img, index) => (
                                <img
                                  key={index}
                                  src={img.url}
                                  alt={img.name}
                                  className="w-full h-24 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-75 transition"
                                  onClick={() => window.open(img.url, '_blank')}
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <CheckCircle size={16} className="text-green-600" />
                            Completed {getTimeSince(task.completedAt)}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}







