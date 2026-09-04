import { Webhook } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

// =====================================================
// CLERK WEBHOOK
// =====================================================

export const clerkWebhooks = async (req, res) => {
  try {
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });

    const { data, type } = req.body;

    switch (type) {
      // USER CREATED
      case "user.created": {
        const userData = {
          _id: data.id,
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data.first_name || ""} ${
            data.last_name || ""
          }`.trim(),
          imageUrl: data.image_url || "",
        };

        await User.findByIdAndUpdate(
          data.id,
          userData,
          {
            upsert: true,
            new: true,
          }
        );

        console.log("MongoDB User Created/Updated:", data.id);

        return res.json({
          success: true,
          message: "User created",
        });
      }

      // USER UPDATED
      case "user.updated": {
        const userData = {
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data.first_name || ""} ${
            data.last_name || ""
          }`.trim(),
          imageUrl: data.image_url || "",
        };

        await User.findByIdAndUpdate(data.id, userData);

        console.log("MongoDB User Updated:", data.id);

        return res.json({
          success: true,
          message: "User updated",
        });
      }

      // USER DELETED
      case "user.deleted": {
        await User.findByIdAndDelete(data.id);

        console.log("MongoDB User Deleted:", data.id);

        return res.json({
          success: true,
          message: "User deleted",
        });
      }

      default: {
        console.log("Unhandled Clerk event:", type);

        return res.json({
          success: true,
          message: "Event received",
        });
      }
    }
  } catch (error) {
    console.error("Clerk Webhook Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// STRIPE
// =====================================================

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// =====================================================
// STRIPE WEBHOOK
// =====================================================

export const stripeWebhooks = async (request, response) => {
  const sig = request.headers["stripe-signature"];

  let event;

  // Verify Stripe webhook
  try {
    event = Stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error(
      "Stripe Signature Error:",
      error.message
    );

    return response
      .status(400)
      .send(`Webhook Error: ${error.message}`);
  }

  try {
    // =================================================
    // CHECKOUT COMPLETED
    // =================================================

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      console.log(
        "Stripe Checkout Completed:",
        session.id
      );

      // Get purchase ID from metadata
      const purchaseId = session.metadata?.purchaseId;

      if (!purchaseId) {
        console.error(
          "Purchase ID not found in Stripe metadata"
        );

        return response.json({
          received: true,
        });
      }

      // Find purchase
      const purchaseData =
        await Purchase.findById(purchaseId);

      if (!purchaseData) {
        console.error(
          "Purchase not found:",
          purchaseId
        );

        return response.json({
          received: true,
        });
      }

      // If already completed, don't enroll twice
      if (purchaseData.status === "completed") {
        console.log(
          "Purchase already completed:",
          purchaseId
        );

        return response.json({
          received: true,
        });
      }

      // Find user
      const userData = await User.findById(
        purchaseData.userId
      );

      // Find course
      const courseData = await Course.findById(
        purchaseData.courseId
      );

      if (!userData || !courseData) {
        console.error(
          "User or Course not found"
        );

        return response.status(404).json({
          success: false,
          message: "User or Course not found",
        });
      }

      // =================================================
      // ADD COURSE TO USER
      // =================================================

      const courseIdString =
        courseData._id.toString();

      if (
        !userData.enrolledCourses.some(
          (id) => id.toString() === courseIdString
        )
      ) {
        userData.enrolledCourses.push(
          courseData._id
        );

        await userData.save();

        console.log(
          "Course added to user:",
          courseIdString
        );
      }

      // =================================================
      // ADD USER TO COURSE
      // =================================================

      const userIdString =
        userData._id.toString();

      if (
        !courseData.enrolledStudents.some(
          (id) => id.toString() === userIdString
        )
      ) {
        courseData.enrolledStudents.push(
          userData._id
        );

        await courseData.save();

        console.log(
          "User added to course:",
          userIdString
        );
      }

      // =================================================
      // UPDATE PURCHASE
      // =================================================

      purchaseData.status = "completed";

      await purchaseData.save();

      console.log(
        "Purchase completed successfully:",
        purchaseId
      );
    }

    // =================================================
    // PAYMENT FAILED
    // =================================================

    else if (
      event.type === "payment_intent.payment_failed"
    ) {
      const paymentIntent = event.data.object;

      console.log(
        "Payment failed:",
        paymentIntent.id
      );
    }

    // =================================================
    // OTHER EVENTS
    // =================================================

    else {
      console.log(
        "Unhandled Stripe event:",
        event.type
      );
    }

    return response.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe Webhook Error:",
      error
    );

    return response.status(500).json({
      success: false,
      message: error.message,
    });
  }
};