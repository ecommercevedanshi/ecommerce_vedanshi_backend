class userValidataion {
  static validateCreateUSer(data) {
    if (!data.name || !data.email || !data.phone) {
      throw new Error("name email and phone all are required");
    }

    if (
      typeof data.name !== "string" ||
      typeof data.email !== "string" ||
      typeof data.phone !== "number"
    ) {
      throw new Error(
        "name and email should be string and phone should be number",
      );
    }

    return true;
  }
}

export default userValidataion;
