import kafka from "../../../config/kafka.js";
import EmailSender from "../../../shared/emailSender.js";
import userService from "../user.service.js";

const notificationConsumer = kafka.consumer({
  groupId: "user-notification-group",
});

const roleUpdateConsumer = kafka.consumer({
  groupId: "user-role-update-group",
});

const walletCreationConsumer = kafka.consumer({
  groupId: "user-wallet-group",
});

class UserConsumer {
  static async startNotificationConsumer() {
    try {
      await notificationConsumer.connect();
      console.log("Notification consumer connected successfully");

      await notificationConsumer.subscribe({
        topic: "user-created",
        fromBeginning: false,
      });

      await notificationConsumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message) return;
          console.log(
            `Received message on topic ${topic}: ${message.value.toString()}`,
          );
          const eventData = JSON.parse(message.value.toString());
          //send wealcoome email to user
          await EmailSender.sendEmail(
            eventData.email,
            "Welcome to our kafka world!!",
            "<h1>Welcome to our Kafka World!</h1><p>Dear User,</p><p>Thank you for joining our Kafka ecosystem. We're excited to have you on board and look forward to providing you with valuable insights and updates.</p><p>Best regards,<br/>The Kafka Team</p>",
          );
        },
      });
    } catch (err) {
      console.error("Error in notification consumer:", err);
    }
  }

  static async startUpdateRoleconsumer() {
    try {
      await roleUpdateConsumer.connect();

      console.log("Role update consumer connected successfully");
      await roleUpdateConsumer.subscribe({
        topic: "role-update",     
        fromBeginning: false,
      });

      await roleUpdateConsumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message) return;
          console.log(
            `Received message on topic ${topic}: ${message.value.toString()}`,
          );
          const eventData = JSON.parse(message.value.toString());

          //update role of user to 1
          await userService.updateUserRole(eventData._id, 2);
        },
      });
    } catch (err) {
      console.error("Error in role update consumer:", err);
    }
  }

  static async startUserWalletCreationConsumer() {
    try {
      await walletCreationConsumer.connect();

      await walletCreationConsumer.subscribe({
        topic: "user-wallet-create",
        fromBeginning: false,
      });
      await walletCreationConsumer.run({
        eachMessage: async (topic, partition, message) => {
          if (!message) return;
          const eventData = JSON.parse(message.value.toString());

          await userService.createwallet(eventData._id)
        },
      });
    } catch (err) {
      console.log("error in wallet creation consumer", err);
    }
  }
}

export default UserConsumer;
