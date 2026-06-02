const clients = new Map();

const registerClient = (userId, socket) => {
    clients.set(userId, socket);
};

const removeClient = (userId) => {
    clients.delete(userId);
};

const sendToUser = (userId, event) => {
    const socket = clients.get(userId);

    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(event));
    }
};

module.exports = {
    registerClient,
    removeClient,
    sendToUser,
};
