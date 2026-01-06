export class Post {
  static table = 'posts'
  static properties = {
    id: {
      type: String,
      primaryKey: true,
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
    createdAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
    }
  }
}
