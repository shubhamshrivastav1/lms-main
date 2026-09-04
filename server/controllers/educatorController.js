import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";

// Update role to educator
export const updateRoleToEducator = async (req, res) => {
  try {
    const userId = req.auth.userId;

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: "educator",
      },
    });

    res.json({
      success: true,
      message: "You can publish a course now",
    });
  } catch (error) {
    console.error("Update Role Error:", error);

    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Add New Course
export const addCourse = async (req, res) => {
  try {
    const { courseData } = req.body;
    const imageFile = req.file;
    const educatorId = req.auth.userId;

    // Check thumbnail
    if (!imageFile) {
      return res.json({
        success: false,
        message: "Thumbnail Not Attached",
      });
    }

    // Convert courseData from string to object
    const parsedCourseData = JSON.parse(courseData);

    // Upload image to Cloudinary
    const imageUpload = await cloudinary.uploader.upload(imageFile.path);

    // Add educator ID
    parsedCourseData.educator = educatorId;

    // Add Cloudinary image URL
    parsedCourseData.courseThumbnail = imageUpload.secure_url;

    // Create course in MongoDB
    const newCourse = await Course.create(parsedCourseData);

    res.json({
      success: true,
      message: "Course Added",
      course: newCourse,
    });
  } catch (error) {
    console.error("Add Course Error:", error);

    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Get Educator Courses
export const getEducatorCourses = async (req, res) => {
  try {
    const educator = req.auth.userId;

    const courses = await Course.find({
      educator,
    });

    res.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Get Educator Courses Error:", error);

    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Get Educator Dashboard Data
// Total Earning, Enrolled Students, No. of Courses
export const educatorDashboard = async (req, res) => {
  try {
    const educator = req.auth.userId;

    // Get educator courses
    const courses = await Course.find({
      educator,
    });

    const totalCourses = courses.length;

    // Get course IDs
    const courseIds = courses.map((course) => course._id);

    // Calculate total earnings from purchases
    const purchases = await Purchase.find({
      courseId: {
        $in: courseIds,
      },
      status: "completed",
    });

    const totalEarnings = purchases.reduce(
      (sum, purchase) => sum + purchase.amount,
      0
    );

    // Collect enrolled student data
    const enrolledStudentsData = [];

    for (const course of courses) {
      const students = await User.find(
        {
          _id: {
            $in: course.enrolledStudents,
          },
        },
        "name imageUrl"
      );

      students.forEach((student) => {
        enrolledStudentsData.push({
          courseTitle: course.courseTitle,
          student,
        });
      });
    }

    res.json({
      success: true,
      dashboardData: {
        totalEarnings,
        enrolledStudentsData,
        totalCourses,
      },
    });
  } catch (error) {
    console.error("Educator Dashboard Error:", error);

    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Get Enrolled Students Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educator = req.auth.userId;

    // Get educator courses
    const courses = await Course.find({
      educator,
    });

    // Get course IDs
    const courseIds = courses.map((course) => course._id);

    // Get purchases
    const purchases = await Purchase.find({
      courseId: {
        $in: courseIds,
      },
      status: "completed",
    })
      .populate("userId", "name imageUrl")
      .populate("courseId", "courseTitle");

    // Format enrolled student data
    const enrolledStudents = purchases.map((purchase) => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt,
    }));

    res.json({
      success: true,
      enrolledStudents,
    });
  } catch (error) {
    console.error("Get Enrolled Students Error:", error);

    res.json({
      success: false,
      message: error.message,
    });
  }
};