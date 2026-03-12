import User from "./user.model.js";
import { publishEvent } from "../../config/producer.kafka.js";
class userService {
  static async createUser(data) {
    const prevUser = await User.findOne({
      $or: [{ email: data.email }, { phone: data.phone }],
    });
    if (prevUser) {
      throw new Error("User with this email or phone already exists");
    }
    const user = await User.create(data);
    if (!user) {
      throw new Error("Failed to create user");
    }

    //publish event for update role
    await publishEvent("user-created", user);
    // publish event for send email
    await publishEvent("role-update", user);

    await publishEvent('create-user-wallet', user)

    return user;
  }

  static async updateUserRole(userId, newRole) {
    try {
      await User.findByIdAndUpdate(userId, {
        role: newRole,
      });

      console.log("user role updated from kafka consumer");
    } catch (err) {
      console.error("Error updating user role:", err);
    }
  }
}

export default userService;
