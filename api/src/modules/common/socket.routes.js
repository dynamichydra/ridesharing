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
            try {
                const token = request.query.token;
                console.log("token",token);
                
                if (!token) {
                    connection.socket.close();
                    return;
                }

                // Verify the JWT token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.userId;

                registerClient(userId, connection.socket);

                console.log(`WS Connected: ${userId}`);

                connection.socket.on("message", (messageStr) => {
                    try {
                        const data = JSON.parse(messageStr);
                        if (data.type === "ping") {
                            connection.socket.send(JSON.stringify({ type: "pong" }));
                        }
                    } catch (parseErr) {
                        // Ignore malformed messages
                    }
                });

                connection.socket.on("close", () => {
                    removeClient(userId);
                    console.log(`WS Disconnected: ${userId}`);
                });

                connection.socket.on("error", (err) => {
                    console.error(`WS Error for user ${userId}:`, err.message);
                    removeClient(userId);
                });
            } catch (err) {
                connection.socket.close();
            }
        }
    );
}

module.exports = socketRoutes;
