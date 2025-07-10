# Telemedicine Platform API Server

A comprehensive telemedicine platform API built with Node.js, Express, MongoDB, and Socket.IO for real-time messaging.

## Features

- **User Management**: Patient, Doctor, and Admin roles with JWT authentication
- **Appointment System**: Book, manage, and track appointments
- **Real-time Messaging**: Chat between patients and doctors using Socket.IO
- **Health Posts**: Doctors can publish health information articles
- **Role-based Access Control**: Secure endpoints based on user roles
- **Input Validation**: Comprehensive validation using express-validator
- **Security**: Helmet, CORS, rate limiting, and password hashing

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. **Clone the repository and navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   Create a `.env` file in the server directory with the following variables:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/telemedicine

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system or use a cloud instance.

5. **Run the server**
   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication & Users

#### Register User
```
POST /api/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "patient",
  "age": 30,
  "gender": "male"
}
```

#### Login User
```
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get User Profile
```
GET /api/users/profile
Authorization: Bearer <JWT_TOKEN>
```

#### Update Profile
```
PUT /api/users/profile
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "John Smith",
  "age": 31
}  
```

#### List Doctors (Patients only)
```
GET /api/users/doctors?specialty=cardiology
Authorization: Bearer <JWT_TOKEN>
```

### Appointments

#### Book Appointment (Patients only)
```
POST /api/appointments/book
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "doctorId": "doctor_id_here",
  "dateTime": "2024-01-15T10:00:00.000Z",
  "note": "Regular checkup"
}
```

#### Get My Appointments
```
GET /api/appointments/my?status=pending&upcoming=true
Authorization: Bearer <JWT_TOKEN>
```

#### Update Appointment Status (Doctors only)
```
PUT /api/appointments/:id
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "status": "confirmed"
}
```

### Messaging

#### Send Message
```
POST /api/messages/send
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "receiverId": "user_id_here",
  "content": "Hello, how are you?"
}
``` 

#### Get Messages with User
```
GET /api/messages/:userId
Authorization: Bearer <JWT_TOKEN>
```

#### Get Recent Conversations
```
GET /api/messages/conversations/recent
Authorization: Bearer <JWT_TOKEN>
```

#### Mark Messages as Read
```
PUT /api/messages/:userId/read
Authorization: Bearer <JWT_TOKEN>
```

### Health Posts

#### Create Post (Doctors/Admins only)
```
POST /api/posts
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "title": "Healthy Living Tips",
  "content": "Here are some tips for maintaining a healthy lifestyle..."
}
```

#### Get All Posts
```
GET /api/posts?page=1&limit=10
```

#### Get Posts by Doctor
```
GET /api/posts/doctor/:doctorId?page=1&limit=10
```

## Real-time Messaging with Socket.IO

The server includes Socket.IO for real-time messaging. Connect to the server and authenticate:

```javascript
const socket = io('http://localhost:3000');

// Authenticate with JWT token
socket.emit('authenticate', 'your_jwt_token_here');

// Listen for authentication response
socket.on('authenticated', (data) => {
  console.log('Authenticated:', data.message);
});

// Send private message
socket.emit('private_message', {
  receiverId: 'user_id_here',
  content: 'Hello!'
});

// Listen for new messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
});

// Typing indicators
socket.emit('typing_start', { receiverId: 'user_id_here' });
socket.emit('typing_stop', { receiverId: 'user_id_here' });
```

## User Roles & Permissions

### Patient
- Register and login
- View and update profile
- List available doctors
- Book appointments
- Send/receive messages
- View health posts

### Doctor
- Register and login
- View and update profile
- Manage appointments (confirm, complete, cancel)
- Send/receive messages
- Create health posts
- View patient appointments

### Admin
- All doctor permissions
- Approve doctor registrations
- Manage all users and content

## Database Models

### User
- name, email, password (hashed)
- role: patient/doctor/admin
- age, gender, specialty (for doctors)
- availability schedule (for doctors)

### Appointment
- patientId, doctorId (references to User)
- dateTime, note, status
- createdAt timestamp

### Message
- senderId, receiverId (references to User)
- content, timestamp, read status

### Post
- authorId (reference to User)
- title, content, date

## Security Features

- **Password Hashing**: bcryptjs for secure password storage
- **JWT Authentication**: Stateless authentication with configurable expiration
- **Role-based Access Control**: Middleware for endpoint protection
- **Input Validation**: express-validator for request validation
- **Rate Limiting**: Prevents abuse with configurable limits
- **Security Headers**: Helmet for security headers
- **CORS**: Configurable cross-origin resource sharing

## Error Handling

The API returns consistent error responses:

```json
{
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

## Development

### Scripts
- `npm run dev`: Start development server with nodemon
- `npm start`: Start production server
- `npm test`: Run tests (to be implemented)

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRE`: JWT token expiration time
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

## Health Check

Monitor server status:
```
GET /health
```

Returns:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License. 