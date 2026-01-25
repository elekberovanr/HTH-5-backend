const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { io } = require('../server');
const cloudinary = require("../utils/cloudinary");


exports.startChat = async (req, res) => {
  const senderId = req.userId;
  const receiverId = req.body.receiverId;

  let chat = await Chat.findOne({
    participants: { $all: [senderId, receiverId] },
  });

  if (!chat) {
    chat = await Chat.create({ participants: [senderId, receiverId] });
  }
  res.status(200).json(chat);
};

exports.getUserChats = async (req, res) => {
  try {
    const userId = req.params.userId;

    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'name username profileImage')
      .lean();

    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await Message.findOne({ chat: chat._id })
          .sort({ createdAt: -1 })
          .lean();

        chat.latestMessage = lastMessage || null;

        const unreadCount = await Message.countDocuments({
          chat: chat._id,
          receiver: userId,
          read: false,
        });

        chat.unreadCount = unreadCount;
        return chat;
      })
    );

    res.json(enrichedChats);
  } catch (err) {
    console.error('❌ Failed to fetch chats:', err);
    res.status(500).json({ message: 'Failed to fetch chats' });
  }
};



exports.getChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'username name profileImage');

    if (!chat) return res.status(404).json({ message: 'Chat tapılmadı' });

    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Xəta baş verdi' });
  }
};
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    let image = "";

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "hth/chat" },
          (err, res) => (err ? reject(err) : resolve(res))
        ).end(req.file.buffer);
      });
      image = result.secure_url;
    }

    const message = await Message.create({
      chat: chatId,
      sender: req.userId,
      content: content || '',
      image: image || '',
      read: false,
    });

    await message.populate('sender', 'username name profileImage');

    const chat = await Chat.findById(chatId);
    chat.updatedAt = new Date();
    chat.latestMessage = message._id; // ✅ Əlavə olundu!

    chat.participants.forEach(pId => {
      const idStr = pId.toString();
      if (idStr !== req.userId) {
        if (!chat.unreadCounts) chat.unreadCounts = {};
        chat.unreadCounts[idStr] = (chat.unreadCounts[idStr] || 0) + 1;
      }
    });

    await chat.save();

    // ✅ Emit message + updated unreadCount
    io.to(chatId).emit('newMessage', {
      ...message.toObject(),
      chatId,
      unreadCounts: chat.unreadCounts
    });

    res.status(201).json(message);
  } catch (err) {
    console.error("Mesaj göndərilmə xətası:", err);
    res.status(500).json({ error: "Mesaj göndərilmədi" });
  }
};




exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'username name profileImage')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Mesajlar alınmadı' });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  const { userId } = req.params;
  const { chatId } = req.body;

  try {
    await Message.updateMany(
      { chat: chatId, sender: { $ne: userId }, read: false },
      { $set: { read: true } }
    );
    const chat = await Chat.findById(chatId);
    if (chat?.unreadCounts?.[userId]) {
      chat.unreadCounts[userId] = 0;
      await chat.save();
    }

    res.json({ message: 'Oxunmuş kimi qeyd olundu' });
  } catch (err) {
    res.status(500).json({ error: 'Oxunma xətası' });
  }
};



exports.deleteMessage = async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: 'Mesaj silindi' });
  } catch (err) {
    res.status(500).json({ error: 'Mesaj silinə bilmədi' });
  }
};
