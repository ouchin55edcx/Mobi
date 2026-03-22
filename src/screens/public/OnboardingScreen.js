import React, { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    FlatList,
    TouchableOpacity,
    Animated,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { UbuntuFonts } from "../../shared/utils/fonts";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SLIDES = [
    {
        id: "1",
        title: {
            en: "Smart Campus Commute",
            ar: "تنقل ذكي للحرم الجامعي",
        },
        description: {
            en: "Efficient, reliable transportation tailored for university students. Get to your classes on time, every time.",
            ar: "نقل فعال وموثوق مصمم لطلاب الجامعات. احصل على دروسك في الوقت المحدد ، في كل مرة.",
        },
        icon: "directions-bus",
        colors: ["#3B82F6", "#1D4ED8"],
    },
    {
        id: "2",
        title: {
            en: "Real-time Tracking",
            ar: "تتبع الوقت الحقيقي",
        },
        description: {
            en: "Never miss your bus again. Watch your driver move in real-time and get notified exactly when they approach.",
            ar: "لا تفوت حافلتك مرة أخرى. شاهد سائقك يتحرك في الوقت الفعلي واحصل على إشعار بالضبط عند اقترابه.",
        },
        icon: "location-on",
        colors: ["#10B981", "#059669"],
    },
    {
        id: "3",
        title: {
            en: "Easy & Secure",
            ar: "سهل وآمن",
        },
        description: {
            en: "Simplified registration, secure payments, and a dedicated support team at your fingertips.",
            ar: "تسجيل مبسط ومدفوعات آمنة وفريق دعم مخصص في متناول يدك.",
        },
        icon: "security",
        colors: ["#6366F1", "#4F46E5"],
    },
];

const OnboardingScreen = ({ onFinish, language = "en" }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);

    const viewableItemsChanged = useRef(({ viewableItems }) => {
        setCurrentIndex(viewableItems[0].index);
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollTo = () => {
        if (currentIndex < SLIDES.length - 1) {
            slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
        } else {
            onFinish();
        }
    };

    const skip = () => {
        onFinish();
    };

    const renderItem = ({ item }) => {
        const isRTL = language === "ar";
        return (
            <View style={styles.slide}>
                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={item.colors}
                        style={styles.iconCircle}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <MaterialIcons name={item.icon} size={80} color="#FFFFFF" />
                    </LinearGradient>
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.title, isRTL && styles.rtlText]}>
                        {item.title[language] || item.title.en}
                    </Text>
                    <Text style={[styles.description, isRTL && styles.rtlText]}>
                        {item.description[language] || item.description.en}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            <View style={[styles.header, language === "ar" && styles.headerLeft]}>
                <TouchableOpacity onPress={skip}>
                    <Text style={styles.skipText}>{language === "ar" ? "تخطي" : "Skip"}</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 3 }}>
                <FlatList
                    data={SLIDES}
                    renderItem={renderItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: false }
                    )}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                />
            </View>

            <View style={styles.footer}>
                <View style={styles.indicatorContainer}>
                    {SLIDES.map((_, i) => {
                        const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [10, 20, 10],
                            extrapolate: "clamp",
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: "clamp",
                        });
                        return (
                            <Animated.View
                                key={i.toString()}
                                style={[styles.dot, { width: dotWidth, opacity }]}
                            />
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={styles.button}
                    activeOpacity={0.8}
                    onPress={scrollTo}
                >
                    <LinearGradient
                        colors={SLIDES[currentIndex].colors}
                        style={[styles.buttonGradient, language === "ar" && { flexDirection: "row-reverse" }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.buttonText}>
                            {currentIndex === SLIDES.length - 1
                                ? (language === "ar" ? "ابدأ الآن" : "Get Started")
                                : (language === "ar" ? "التالي" : "Next")}
                        </Text>
                        <MaterialIcons
                            name={currentIndex === SLIDES.length - 1 ? "check" : (language === "ar" ? "arrow-back" : "arrow-forward")}
                            size={20}
                            color="#FFFFFF"
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    header: {
        paddingHorizontal: 30,
        paddingVertical: 20,
        alignItems: "flex-end",
    },
    headerLeft: {
        alignItems: "flex-start",
    },
    skipText: {
        color: "#94A3B8",
        fontSize: 16,
        fontFamily: UbuntuFonts.medium,
    },
    slide: {
        width: SCREEN_WIDTH,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
    },
    iconContainer: {
        height: SCREEN_HEIGHT * 0.4,
        justifyContent: "center",
    },
    iconCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    textContainer: {
        height: SCREEN_HEIGHT * 0.2,
        alignItems: "center",
    },
    title: {
        fontSize: 28,
        fontFamily: UbuntuFonts.bold,
        color: "#1E293B",
        textAlign: "center",
        marginBottom: 15,
    },
    description: {
        fontSize: 16,
        fontFamily: UbuntuFonts.regular,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 24,
    },
    rtlText: {
        textAlign: "right",
    },
    footer: {
        flex: 0.2,
        justifyContent: "space-between",
        paddingHorizontal: 40,
        paddingBottom: 40,
    },
    indicatorContainer: {
        flexDirection: "row",
        height: 10,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 30,
    },
    dot: {
        height: 10,
        borderRadius: 5,
        backgroundColor: "#3B82F6",
        marginHorizontal: 5,
    },
    button: {
        width: "100%",
        height: 60,
        borderRadius: 18,
        overflow: "hidden",
    },
    buttonGradient: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontFamily: UbuntuFonts.bold,
    },
});

export default OnboardingScreen;
