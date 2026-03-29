import mongoose, { Schema, Model } from 'mongoose';

export type SearchType = 'all' | 'interface' | 'project' | 'group';

export interface ISearchHistory {
  user_id: Schema.Types.ObjectId;
  keyword: string;
  search_type: SearchType;
  result_count: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SearchHistoryModel = Model<ISearchHistory>;

const searchHistorySchema = new Schema<ISearchHistory>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
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

searchHistorySchema.index({ user_id: 1, createdAt: -1 });
searchHistorySchema.index({ user_id: 1, keyword: 1 });

const SearchHistory = mongoose.model<ISearchHistory, SearchHistoryModel>('SearchHistory', searchHistorySchema);

export default SearchHistory;
