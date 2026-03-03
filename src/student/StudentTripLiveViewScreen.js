import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
    Animated,
    Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import { UbuntuFonts } from "../shared/utils/fonts";
import { getDirectionsRoute } from "../shared/services/mapboxService";
import { mockTrip } from "../shared/mock/mockDriverData";
import { DEMO_STUDENT } from "../shared/data/demoData";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
    primary: "#1D4ED8",
    primaryLight: "#3B82F6",
    primarySurface: "#EFF6FF",
    success: "#16A34A",
    successLight: "#DCFCE7",
    neutral900: "#0F172A",
    neutral700: "#334155",
    neutral500: "#64748B",
    neutral100: "#F1F5F9",
    white: "#FFFFFF",
};

const translations = {
    en: {
        liveTrip: "Live Tracking",
        busComing: "Bus is on the way",
        eta: "ETA",
        distance: "Distance",
        busPos: "Bus Position",
        yourPos: "Your Location",
        back: "Back",
        min: "min",
        km: "km",
    },
    ar: {
        liveTrip: "تتبع مباشر",
        busComing: "الحافلة في الطريق",
        eta: "الوقت المتوقع",
        distance: "المسافة",
        busPos: "موقع الحافلة",
        yourPos: "موقعك",
        back: "رجوع",
        min: "د",
        km: "كم",
    },
};

const StudentTripLiveViewScreen = ({
    studentId = DEMO_STUDENT.id,
    language = "en",
    isDemo = true,
    onBack,
}) => {
    const t = translations[language] || translations.en;

    // Demo states
    const [driverLocation, setDriverLocation] = useState(mockTrip.parkingLocation);
    const [studentLocation] = useState(DEMO_STUDENT.home_location);
    const [routeData, setRouteData] = useState(null);
    const [eta, setEta] = useState(null);
    const [distance, setDistance] = useState(null);
    const [activeAlert, setActiveAlert] = useState(null);

    const mapRef = useRef(null);
    const alertAnim = useRef(new Animated.Value(-100)).current;
    const livePulse = useRef(new Animated.Value(1)).current;
    const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

    const showAlert = (message) => {
        setActiveAlert(message);
        Animated.spring(alertAnim, {
            toValue: 20,
            useNativeDriver: true,
            tension: 40,
            friction: 7,
        }).start();

        setTimeout(() => {
            Animated.timing(alertAnim, {
                toValue: -120,
                duration: 500,
                useNativeDriver: true,
            }).start(() => setActiveAlert(null));
        }, 3000);
    };

    // Simulate bus movement along the route
    useEffect(() => {
        if (!isDemo || !routeData?.coordinates?.length) return;

        // Demo: Show alert after 2 seconds
        const alertTimer = setTimeout(() => {
            showAlert(language === 'ar' ? "يرجى التوجه إلى نقطة الالتقاء الآن" : "Please be at your pickup point now!");
            Vibration.vibrate([0, 100, 50, 100]);
        }, 2000);

        let index = 0;
        const interval = setInterval(() => {
            if (index < routeData.coordinates.length - 1) {
                index++;
                setDriverLocation(routeData.coordinates[index]);
            } else {
                // Return to start or stay at end
                index = 0;
                setDriverLocation(routeData.coordinates[0]);
            }
        }, 3000); // Move every 3 seconds for demo

        return () => clearInterval(interval);
    }, [isDemo, routeData]);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(livePulse, { toValue: 0.6, duration: 800, useNativeDriver: true }),
                Animated.timing(livePulse, { toValue: 1, duration: 800, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [livePulse]);

    useEffect(() => {
        const loadRoute = async () => {
            // Same route logic as driver but seen from student's perspective
            const students = mockTrip.students;
            const r = await getDirectionsRoute({
                origin: driverLocation,
                waypoints: students.map(s => s.homeLocation).filter(Boolean),
                destination: mockTrip.destinationLocation,
            });
            setRouteData(r);

            // Calculate ETA specifically to THIS student
            // Find this student in the list
            const thisStudent = students.find(s => s.id === studentId) || students[0];
            const etaRoute = await getDirectionsRoute({
                origin: driverLocation,
                destination: thisStudent.homeLocation,
            });
            if (etaRoute) {
                setEta(Math.round(etaRoute.durationSeconds / 60));
                setDistance((etaRoute.distanceMeters / 1000).toFixed(1));
            }
        };
        loadRoute();
    }, [driverLocation]);

    useEffect(() => {
        if (mapRef.current && routeData?.coordinates) {
            mapRef.current.fitToCoordinates(routeData.coordinates, {
                edgePadding: { top: 100, right: 60, bottom: 240, left: 60 },
                animated: true,
            });
        }
    }, [routeData]);

    return (
        <SafeAreaView style={styles.container} edges={[]}>
            <StatusBar style="dark" />

            {/* In-app Alert Overlay */}
            {activeAlert && (
                <Animated.View style={[styles.alertOverlay, { transform: [{ translateY: alertAnim }] }]}>
                    <View style={styles.alertContent}>
                        <View style={styles.alertIconBg}>
                            <MaterialIcons name="notifications-active" size={20} color={COLORS.white} />
                        </View>
                        <Text style={styles.alertText}>{activeAlert}</Text>
                    </View>
                </Animated.View>
            )}

            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                mapType={mapboxToken ? "none" : "standard"}
                initialRegion={{
                    latitude: studentLocation.latitude,
                    longitude: studentLocation.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }}
                showsUserLocation={!isDemo}
                showsMyLocationButton={!isDemo}
                showsCompass={false}
                toolbarEnabled={false}
            >
                {mapboxToken && (
                    <UrlTile
                        urlTemplate={`https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`}
                        maximumZ={20}
                        flipY={false}
                    />
                )}

                {routeData?.coordinates && (
                    <Polyline
                        coordinates={routeData.coordinates}
                        strokeColor={COLORS.primary}
                        strokeWidth={4}
                    />
                )}

                {/* Other student stops (Anonymous dots) */}
                {mockTrip.students.map((s, idx) => {
                    const isMe = s.id === studentId;
                    if (isMe) return null; // Logic for "Me" is below

                    return (
                        <Marker
                            key={`stop-${idx}`}
                            coordinate={s.homeLocation}
                            anchor={{ x: 0.5, y: 0.5 }}
                            tracksViewChanges={false}
                        >
                            <View style={styles.otherStopDot} />
                        </Marker>
                    );
                })}

                {/* Bus Marker */}
                <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }} zIndex={10}>
                    <View style={styles.busMarkerWrapper}>
                        <Animated.View style={[styles.busPulse, { opacity: livePulse, transform: [{ scale: livePulse }] }]} />
                        <View style={styles.busMarkerCore}>
                            <MaterialIcons name="directions-bus" size={18} color={COLORS.white} />
                        </View>
                    </View>
                </Marker>

                {/* My Pickup Location */}
                <Marker coordinate={studentLocation} anchor={{ x: 0.5, y: 1 }} zIndex={5}>
                    <View style={styles.myMarkerContainer}>
                        <View style={styles.myMarkerLabel}>
                            <Text style={styles.myMarkerText}>{t.yourPos}</Text>
                        </View>
                        <View style={styles.studentMarkerCore} />
                        <View style={styles.markerStem} />
                    </View>
                </Marker>
            </MapView>

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.neutral900} />
                </TouchableOpacity>
                <View style={styles.liveBadge}>
                    <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
                    <Text style={styles.liveText}>{t.liveTrip}</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            {/* Bottom Panel */}
            <View style={styles.bottomPanel}>
                <Text style={styles.panelTitle}>{t.busComing}</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statBlock}>
                        <Text style={styles.statValue}>{eta || "--"}</Text>
                        <Text style={styles.statLabel}>{t.min} {t.eta}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statBlock}>
                        <Text style={styles.statValue}>{distance || "--"}</Text>
                        <Text style={styles.statLabel}>{t.km} {t.distance}</Text>
                    </View>
                </View>
                {/* Simple Progress Visualization */}
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '40%' }]} />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    topBar: {
        position: "absolute",
        top: Platform.OS === "ios" ? 56 : 42,
        left: 20,
        right: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    liveBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: COLORS.neutral900,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 99,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#EF4444",
    },
    liveText: {
        color: COLORS.white,
        fontFamily: UbuntuFonts.bold,
        fontSize: 12,
        letterSpacing: 1,
    },
    bottomPanel: {
        position: "absolute",
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
    },
    panelTitle: {
        fontFamily: UbuntuFonts.bold,
        fontSize: 18,
        color: COLORS.neutral900,
        marginBottom: 20,
        textAlign: "center",
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    statBlock: {
        flex: 1,
        alignItems: "center",
    },
    statValue: {
        fontFamily: UbuntuFonts.bold,
        fontSize: 28,
        color: COLORS.primary,
    },
    statLabel: {
        fontFamily: UbuntuFonts.medium,
        fontSize: 12,
        color: COLORS.neutral500,
        marginTop: 4,
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.neutral100,
    },
    progressBar: {
        height: 6,
        backgroundColor: COLORS.neutral100,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    busMarkerWrapper: {
        alignItems: "center",
        justifyContent: "center",
        width: 50,
        height: 50,
    },
    busPulse: {
        position: "absolute",
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary + "30",
    },
    busMarkerCore: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    studentMarkerWrapper: {
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
    },
    studentMarkerCore: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
        zIndex: 2,
    },
    studentMarkerRing: {
        position: "absolute",
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primary + "20",
        borderWidth: 1,
        borderColor: COLORS.primary + "40",
    },
    otherStopDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.neutral500 + "60",
        borderWidth: 1,
        borderColor: COLORS.white,
    },
    myMarkerContainer: {
        alignItems: "center",
    },
    myMarkerLabel: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 4,
    },
    myMarkerText: {
        color: COLORS.white,
        fontFamily: UbuntuFonts.bold,
        fontSize: 10,
    },
    markerStem: {
        width: 2,
        height: 4,
        backgroundColor: COLORS.primary,
    },
    alertOverlay: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        zIndex: 100,
    },
    alertContent: {
        backgroundColor: COLORS.neutral900,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    alertIconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertText: {
        flex: 1,
        color: COLORS.white,
        fontFamily: UbuntuFonts.bold,
        fontSize: 14,
        lineHeight: 20,
    },
});

export default StudentTripLiveViewScreen;
