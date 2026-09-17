import mongoose, { Schema, Model } from 'mongoose';

export interface IVariableEntry {
  key: string;
  value: string;
  enabled: boolean;
  type: 'default' | 'secret';
}

export interface IProjectVariableStore {
  project_id: Schema.Types.ObjectId;
  globals: IVariableEntry[];
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectVariableStoreModel = Model<IProjectVariableStore>;

const variableEntrySchema = new Schema<IVariableEntry>(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    type: { type: String, enum: ['default', 'secret'], default: 'default' },
  },
  { _id: false }
);

const projectVariableStoreSchema = new Schema<IProjectVariableStore>(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true,
      index: true,
    },
    globals: {
      type: [variableEntrySchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const ProjectVariableStore = mongoose.model<IProjectVariableStore, ProjectVariableStoreModel>(
  'ProjectVariableStore',
  projectVariableStoreSchema
);

export function entriesToMap(entries: IVariableEntry[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of entries) {
    if (e?.enabled !== false && e.key) {
      out[e.key] = e.value ?? '';
    }
  }
  return out;
}

export function mapToEntries(map: Record<string, any> = {}): IVariableEntry[] {
  return Object.entries(map || {}).map(([key, value]) => ({
    key,
    value: value == null ? '' : String(value),
    enabled: true,
    type: 'default' as const,
  }));
}

export default ProjectVariableStore;
