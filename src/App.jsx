import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Clock, User, Plus, LogOut, X, AlertCircle } from 'lucide-react';

export default function ClientUpdateApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [isSignup, setIsSignup] = useState(false);
  const [users, setUsers] = useState([
    { id: 1, email: 'admin@yourbusiness.com', password: 'admin123', name: 'Admin', type: 'admin' }
  ]);
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', images: [] });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!currentUser || currentUser.type !== 'admin') return;

    const checkReminders = () => {
      const now = new Date();
      const fourHours = 4 * 60 * 60 * 1000;

      setTasks(prevTasks => {
        return prevTasks.map(task => {
          if (task.status === 'pending') {
            const timeSinceLastReminder = now - new Date(task.lastReminder);
            if (timeSinceLastReminder >= fourHours) {
              addNotification(`Reminder: "${task.title}" from ${task.clientName} needs attention`);
              return { ...task, lastReminder: now };
            }
          }
          return task;
        });
      });
    };

    const interval = setInterval(checkReminders, 60000);
    checkReminders();

    return () => clearInterval(interval);
  }, [currentUser]);

  const addNotification = (message) => {
    const newNotif = { id: Date.now(), message, time: new Date() };
    setNotifications(prev => [newNotif, ...prev].slice(0, 10));
  };

  const handleAuth = () => {
    if (isSignup) {
      if (!formData.name || !formData.email || !formData.password) {
        alert('Please fill in all fields');
        return;
      }
      const newUser = {
        id: users.length + 1,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        type: 'client'
      };
      setUsers([...users, newUser]);
      setCurrentUser(newUser);
      setShowLogin(false);
      addNotification(`Welcome ${newUser.name}! Your account has been created.`);
    } else {
      const user = users.find(u => u.email === formData.email && u.password === formData.password);
      if (user) {
        setCurrentUser(user);
        setShowLogin(false);
        addNotification(`Welcome back, ${user.name}!`);
      } else {
        alert('Invalid credentials');
      }
    }
    setFormData({ email: '', password: '', name: '' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowLogin(true);
    setShowTaskForm(false);
    setTaskForm({ title: '', description: '', images: [] });
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
          images: [...prev.images, { url: event.target.result, name: file.name }]
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

  const submitTask = () => {
    if (!taskForm.title || !taskForm.description) {
      alert('Please fill in title and description');
      return;
    }
    const newTask = {
      id: Date.now(),
      clientId: currentUser.id,
      clientName: currentUser.name,
      title: taskForm.title,
      description: taskForm.description,
      images: taskForm.images,
      status: 'pending',
      createdAt: new Date(),
      lastReminder: new Date()
    };
    setTasks([...tasks, newTask]);
    setTaskForm({ title: '', description: '', images: [] });
    setShowTaskForm(false);
    addNotification(`New update request submitted: "${newTask.title}"`);
  };

  const submitForReview = (taskId) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: 'pending_review', submittedForReview: new Date() } : t
    ));
    const task = tasks.find(t => t.id === taskId);
    addNotification(`Task "${task.title}" submitted for ${task.clientName}'s review`);
  };

  const approveTask = (taskId) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: 'completed', completedAt: new Date() } : t
    ));
    const task = tasks.find(t => t.id === taskId);
    addNotification(`Task "${task.title}" approved and completed!`);
  };

  const requestChanges = (taskId) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: 'pending', lastReminder: new Date() } : t
    ));
    const task = tasks.find(t => t.id === taskId);
    addNotification(`Changes requested for "${task.title}" - back to in progress`);
  };

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    addNotification('Task deleted');
  };

  const getTimeSince = (date) => {
    const minutes = Math.floor((new Date() - new Date(date)) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const reviewTasks = tasks.filter(t => t.status === 'pending_review');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Updates</h1>
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

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-semibold mb-2">Demo Credentials:</p>
            <p>Admin: admin@yourbusiness.com / admin123</p>
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
              <div className="relative">
                <Bell className="text-indigo-600" size={24} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.length}
                </span>
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
        {notifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {notifications.slice(0, 3).map(notif => (
              <div key={notif.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Bell className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{getTimeSince(notif.time)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentUser.type === 'client' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                <Plus size={20} />
                New Update Request
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
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
                    >
                      Submit Request
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
                <p className="text-3xl font-bold text-gray-900">{users.filter(u => u.type === 'client').length}</p>
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
