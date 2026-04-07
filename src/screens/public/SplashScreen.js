import React, { useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import { supabase } from "../../lib/supabase";
import { getDriverByEmail } from "../../shared/services/driverService";

const SplashScreen = ({ onSplashComplete }) => {
  useEffect(() => {
    const checkSession = async () => {
      // Wait a bit for the splash animation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // User is logged in and OTP verified — check their role
        const userEmail = session.user.email;

        // Check drivers table first
        const { data: driver } = await getDriverByEmail(userEmail);

        if (driver) {
          if (driver.status === "APPROVED") {
            onSplashComplete("driverHome");
          } else if (driver.status === "REJECTED") {
            onSplashComplete("selectRole");
          } else {
            onSplashComplete("pendingApproval");
          }
          return;
        }

        // Check students table
        const { data: student } = await supabase
          .from("students")
          .select("id")
          .eq("email", userEmail)
          .single();

        if (student) {
          onSplashComplete("studentHome");
          return;
        }

        // Has auth session but no profile — send to SelectRole
        onSplashComplete("selectRole");
      } else {
        // Not logged in
        onSplashComplete("selectRole");
      }
    };

    checkSession();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/Logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 250,
    height: 250,
  },
});

export default SplashScreen;
