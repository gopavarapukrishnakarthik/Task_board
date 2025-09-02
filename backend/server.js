const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: { origin: "*" },
});

global._io = io;
const PORT = 5000;
app.use(
  cors({
    origin: "http://192.168.0.118:5173",
    credentials: true,
  })
);
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json());
app.use(cookieParser());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"));

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
