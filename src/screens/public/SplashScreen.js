import React, { useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import { supabase } from "../../lib/supabase";
import { getDriverByEmail } from "../../shared/services/driverService";

const SplashScreen = () => {
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
