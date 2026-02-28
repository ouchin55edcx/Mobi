import { useState } from 'react';
import { createStudent, getStudentById, getStudentByEmail, updateStudent } from '../services/studentService';

/**
 * Custom hook for student operations
 */
export const useStudent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const registerStudent = async (studentData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await createStudent(studentData);
      
      if (result.error) {
        setError(result.error.message || 'Failed to register student');
        return { success: false, data: null, error: result.error };
      }

      return { success: true, data: result.data, error: null };
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const fetchStudent = async (studentId) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getStudentById(studentId);
      
      if (result.error) {
        setError(result.error.message || 'Failed to fetch student');
        return { success: false, data: null, error: result.error };
      }

      return { success: true, data: result.data, error: null };
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentByEmail = async (email) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getStudentByEmail(email);
      
      if (result.error) {
        setError(result.error.message || 'Failed to fetch student');
        return { success: false, data: null, error: result.error };
      }

      return { success: true, data: result.data, error: null };
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateStudentData = async (studentId, updates) => {
    setLoading(true);
    setError(null);

    try {
      const result = await updateStudent(studentId, updates);
      
      if (result.error) {
        setError(result.error.message || 'Failed to update student');
        return { success: false, data: null, error: result.error };
      }

      return { success: true, data: result.data, error: null };
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    registerStudent,
    fetchStudent,
    fetchStudentByEmail,
    updateStudentData,
  };
};

