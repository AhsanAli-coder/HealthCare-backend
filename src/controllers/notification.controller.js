import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Notification from "../models/notification.model.js";

const getMyNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly, limit } = req.query;
  const query = { userId: req.user._id };
  if (String(unreadOnly) === "true") query.isRead = false;

  const take = Math.min(Math.max(Number(limit || 50), 1), 200);

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(take);

  return res
    .status(200)
    .json(new ApiResponse(200, notifications, "Notifications fetched successfully"));
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) throw new ApiError(404, "Notification not found");

  return res
    .status(200)
    .json(new ApiResponse(200, notification, "Notification marked as read"));
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "All notifications marked as read"));
});

export { getMyNotifications, markNotificationRead, markAllRead };

