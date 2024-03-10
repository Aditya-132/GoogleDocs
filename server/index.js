const mongoose = require('mongoose');
const Document = require('./Document');

const defaultValue = "";

mongoose.connect("mongodb://127.0.0.1:27017/GoogleDocs", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const io = require('socket.io')(3001, {
    cors: {
        origin: "http://localhost:3000",
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log(`${socket.id} connected`);

    socket.on("get-document", async (documentId) => {
        try {
            const document = await findOrCreateDocument(documentId);
            socket.join(documentId);
            socket.emit('load-document', document.data);
            socket.on('send-changes',(delta)=>{
                socket.broadcast.to(documentId).emit('receive-changes',delta)}
            )
            socket.on('save-document', async (data) => {
                await Document.findByIdAndUpdate(documentId, { data });
            });
        } catch (error) {
            console.error("Error getting document:", error);
            socket.emit('load-document-error', { message: "Error loading document" });
        }
    });

    socket.on('disconnect', () => {
        console.log(`${socket.id} disconnected`);
    });
});

async function findOrCreateDocument(id) {
    if (!id) return;
    let document = await Document.findById(id);
    if (!document) {
        document = await Document.create({
            _id: id,
            data: defaultValue
        });
    }
    return document;
}
