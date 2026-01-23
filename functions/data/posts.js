export class Post {
  static table = 'posts'
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
    userId: {
      type: String,
    },
    title: {
      type: String,
    },
    content: {
      type: String,
    },
    data: {
      type: Object,
    },
  }
}
