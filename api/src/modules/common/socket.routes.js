const jwt = require("jsonwebtoken");
const { registerClient, removeClient } = require("./socket.manager");

async function socketRoutes(app) {
    app.get(
        "/ws",
        {
            config: { rateLimit: false },
            websocket: true,
        },
        (connection, request) => {
            const socket =
                connection.socket || connection;
            try {
                const token = request.query.token;
                if (!token) {
                    socket.close();
                    return;
                }

                // Verify the JWT token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.userId;

                registerClient(userId, socket);

                console.log(`WS Connected: ${userId}`);

                socket.on("message", (messageStr) => {
                    try {
                        const data = JSON.parse(messageStr);
                        if (data.type === "ping") {
                            socket.send(JSON.stringify({ type: "pong" }));
                        }
                    } catch (parseErr) {
                        // Ignore malformed messages
                    }
                });

                socket.on("close", () => {
                    removeClient(userId);
                    console.log(`WS Disconnected: ${userId}`);
                });

                socket.on("error", (err) => {
                    console.error(`WS Error for user ${userId}:`, err.message);
                    removeClient(userId);
                });
            } catch (err) {
                console.log("SOCKET ERRRO", err);
                socket.close();
            }
        }
    );
}

module.exports = socketRoutes;
