[
  {
    "action": "registerUser",
    "description": "Registers a new patient, doctor, or admin user with hashed password and role assignment.",
    "model": "User",
    "route": "POST /api/users/register",
    "access": "Public",
    "input": {
      "name": "string",
      "email": "string",
      "password": "string",
      "role": "patient | doctor | admin"
    },
    "output": {
      "message": "User registered successfully",
      "token": "JWT Token"
    }
  },
  {
    "action": "loginUser",
    "description": "Authenticates user credentials, generates JWT token, and returns role.",
    "model": "User",
    "route": "POST /api/users/login",
    "access": "Public",
    "input": {
      "email": "string",
      "password": "string"
    },
    "output": {
      "message": "Login successful",
      "token": "JWT Token"
    }
  },
  {
    "action": "getUserProfile",
    "description": "Fetches authenticated user profile data.",
    "model": "User",
    "route": "GET /api/users/profile",
    "access": "Authenticated"
  },
  {
    "action": "updateUserProfile",
    "description": "Updates authenticated user profile info such as name, age, or specialty.",
    "model": "User",
    "route": "PUT /api/users/profile",
    "access": "Authenticated"
  },
  {
    "action": "listDoctors",
    "description": "Lists available doctors optionally filtered by specialty.",
    "model": "User",
    "route": "GET /api/doctors",
    "access": "Patient"
  },
  {
    "action": "bookAppointment",
    "description": "Books a new appointment for a patient with a doctor on a specified date/time.",
    "model": "Appointment",
    "route": "POST /api/appointments/book",
    "access": "Patient"
  },
  {
    "action": "getMyAppointments",
    "description": "Retrieves appointments for the logged-in user (doctor or patient).",
    "model": "Appointment",
    "route": "GET /api/appointments/my",
    "access": "Patient | Doctor"
  },
  {
    "action": "updateAppointmentStatus",
    "description": "Allows a doctor to confirm, complete, or cancel an appointment.",
    "model": "Appointment",
    "route": "PUT /api/appointments/:id",
    "access": "Doctor"
  },
  {
    "action": "sendMessage",
    "description": "Sends a real-time text chat message from one user to another.",
    "model": "Message",
    "route": "POST /api/messages/send",
    "access": "Authenticated"
  },
  {
    "action": "getMessages",
    "description": "Retrieves all chat messages between authenticated user and specified user.",
    "model": "Message",
    "route": "GET /api/messages/:userId",
    "access": "Authenticated"
  },
  {
    "action": "createPost",
    "description": "Allows a doctor or admin to publish a health information post.",
    "model": "Post",
    "route": "POST /api/posts",
    "access": "Doctor | Admin"
  },
  {
    "action": "getPosts",
    "description": "Retrieves all published health posts for public viewing.",
    "model": "Post",
    "route": "GET /api/posts",
    "access": "Public"
  },
  {
    "action": "approveDoctor",
    "description": "Enables an admin to approve a pending doctor account request.",
    "model": "User",
    "route": "POST /api/admin/approve-doctor/:id",
    "access": "Admin"
  }
]
