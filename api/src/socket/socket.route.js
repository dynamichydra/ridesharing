const jwt =
    require(
        "jsonwebtoken"
    );

const {
    registerClient,
    removeClient,
} = require(
    "./socket.manager"
);

async function socketRoutes(
    app
) {
    app.get(
        "/ws",
        {
            websocket:
                true,
        },
        (
            connection,
            request
        ) => {
            try {
                const token =
                    request.query
                        .token;

                if (
                    !token
                ) {
                    connection.socket.close();
                    return;
                }

                const decoded =
                    jwt.verify(
                        token,
                        process.env.JWT_SECRET
                    );

                const userId =
                    decoded.userId;

                registerClient(
                    userId,
                    connection.socket
                );

                console.log(
                    `WS Connected: ${userId}`
                );

                connection.socket.on(
                    "close",
                    () => {
                        removeClient(
                            userId
                        );

                        console.log(
                            `WS Disconnected: ${userId}`
                        );
                    }
                );
            } catch {
                connection.socket.close();
            }
        }
    );
}

module.exports =
    socketRoutes;