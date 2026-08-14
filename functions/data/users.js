// First define your models as classes:
export class User {
  static table = 'users'
  static properties = {
    id: {
      type: String,
      primaryKey: true,
    },
    createdAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    age: {
      type: Number,
    },
    data: {
      type: Object,
      migratedToUserId: {
        type: String,
        index: true,
      },
      someValue: {
        type: String,
        index: true,
      },
    },
  }
}
