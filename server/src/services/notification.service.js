import { isValidObjectId } from "mongoose";
import { Notification } from "../models/notification.model.js";
import { getIO } from "../sockets/socketInstance.js";

const createNotificationService = async (
    senderId,
    currentUserId,
    receivers = [],
    type,
    entityId,
    isGroupNotification = false,
    content,
    renderUrl = ""
) => {
    if ([type, content].some(field => !field || field.trim() === "")) {
        throw new Error("Type and Content are required fields.");
    }

    if (!isValidObjectId(entityId)) {
        throw new Error("Invalid Entity Id.");
    }

    if (isGroupNotification && !receivers.length) {
        throw new Error("Group notification requires receivers.");
    }

    if (!isGroupNotification && !receivers.length) {
        receivers = [currentUserId];
    }

    if (!receivers.length) {
        throw new Error("No receivers found.");
    }

    const filteredReceivers = receivers.filter(id => id.toString() !== senderId.toString());

    const newNotification = await Notification.create({
        sender: senderId,
        receivers: filteredReceivers,
        entity: entityId,
        type,
        isGroupNotification,
        content,
        renderUrl
    });

    if (!newNotification) {
        throw new Error("Error while creating notification.");
    }

    return { newNotification, receivers: filteredReceivers };
};

const createRealTimeNotification = async ({ recipient, type, title, content, data }) => {
    try {
        const notification = await Notification.create({
            sender: null,
            receivers: [recipient],
            type,
            content,
            renderUrl: data?.url || "",
            entity: data?.eventId || data?._id || null
        });

        const io = getIO();
        if (io) {
            io.to(`user_${recipient}`).emit("new_notification", {
                notification: {
                    _id: notification._id,
                    type,
                    title,
                    content,
                    data,
                    createdAt: notification.createdAt
                }
            });
        }

        return notification;
    } catch (error) {
        console.error("Error creating real-time notification:", error);
        return null;
    }
};

const notifyMultipleRealTime = async ({ recipients, type, title, content, data }) => {
    try {
        const notifications = recipients.map(recipientId => ({
            sender: null,
            receivers: [recipientId],
            type,
            content,
            renderUrl: data?.url || "",
            entity: data?.eventId || data?._id || null
        }));

        await Notification.insertMany(notifications);

        const io = getIO();
        if (io) {
            recipients.forEach(recipientId => {
                io.to(`user_${recipientId}`).emit("new_notification", {
                    notification: {
                        type,
                        title,
                        content,
                        data,
                        count: 1
                    }
                });
            });
        }

        return true;
    } catch (error) {
        console.error("Error creating batch notifications:", error);
        return false;
    }
};

export {
    createNotificationService,
    createRealTimeNotification,
    notifyMultipleRealTime
};