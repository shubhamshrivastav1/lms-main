import Course from "../models/Course.js";
import User from "../models/User.js";

// Get All Courses
export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .select("-courseContent -enrolledStudents");

    // Add educator information from Clerk/Mongo User
    const coursesWithEducator = await Promise.all(
      courses.map(async (course) => {
        const educator = await User.findById(course.educator).select(
          "name email imageUrl"
        );

        return {
          ...course.toObject(),
          educator: educator
            ? {
                _id: educator._id,
                name: educator.name,
                email: educator.email,
                imageUrl: educator.imageUrl,
              }
            : null,
        };
      })
    );

    res.json({
      success: true,
      courses: coursesWithEducator,
    });
  } catch (error) {
    console.error("Get All Courses Error:", error);

    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Get Course by Id
export const getCourseId = async (req, res) => {
  try {
    const { id } = req.params;

    const courseData = await Course.findById(id);

    if (!courseData) {
      return res.json({
        success: false,
        message: "Course not found",
      });
    }

    // Get educator using Clerk user ID
    const educator = await User.findById(courseData.educator).select(
      "name email imageUrl"
    );

    // Convert mongoose document to normal object
    const courseObject = courseData.toObject();

    // Add educator information
    courseObject.educator = educator
      ? {
          _id: educator._id,
          name: educator.name,
          email: educator.email,
          imageUrl: educator.imageUrl,
        }
      : null;

    // Remove lecture URL if preview is not free
    courseObject.courseContent.forEach((chapter) => {
      chapter.chapterContent.forEach((lecture) => {
        if (!lecture.isPreviewFree) {
          lecture.lectureUrl = "";
        }
      });
    });

    res.json({
      success: true,
      courseData: courseObject,
    });
  } catch (error) {
    console.error("Get Course Error:", error);

    res.json({
      success: false,
      message: error.message,
    });
  }
};