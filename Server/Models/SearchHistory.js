import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    keyword: {
      type: String,
      required: true,
      trim: true,
    },
    search_type: {
      type: String,
      enum: ['all', 'interface', 'project', 'group'],
      default: 'all',
    },
    result_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引：用户ID + 创建时间（用于查询用户最近的搜索历史）
searchHistorySchema.index({ user_id: 1, createdAt: -1 });

// 复合索引：用户ID + 关键词（用于去重）
searchHistorySchema.index({ user_id: 1, keyword: 1 });

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);

export default SearchHistory;

