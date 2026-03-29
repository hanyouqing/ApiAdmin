import mongoose, { Schema, Model } from 'mongoose';

export type NotificationType = 'interface-change' | 'test-failed' | 'project-update' | 'system';

export interface INotification {
  userId: Schema.Types.ObjectId;
  type: NotificationType;
  title: string;
  content: string;
  read: boolean;
  readAt: Date | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationModel = Model<INotification>;

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['interface-change', 'test-failed', 'project-update', 'system'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

const Notification = mongoose.model<INotification, NotificationModel>('Notification', notificationSchema);

export default Notification;
