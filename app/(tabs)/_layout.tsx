import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { colors } from "@/constants/theme";
import { t } from "@/i18n";

type TabIconName = "home" | "grid" | "heart" | "person";

function TabIcon({ name, color }: { name: TabIconName; color: string }) {
  if (name === "home") {
    return (
      <View style={styles.iconBox}>
        <View style={[styles.homeRoof, { borderBottomColor: color }]} />
        <View style={[styles.homeBody, { backgroundColor: color }]} />
      </View>
    );
  }

  if (name === "grid") {
    return (
      <View style={styles.gridIcon}>
        <View style={[styles.gridCell, { backgroundColor: color }]} />
        <View style={[styles.gridCell, { backgroundColor: color }]} />
        <View style={[styles.gridCell, { backgroundColor: color }]} />
        <View style={[styles.gridCell, { backgroundColor: color }]} />
      </View>
    );
  }

  if (name === "heart") {
    return (
      <View style={styles.iconBox}>
        <View style={[styles.heartBase, { backgroundColor: color }]}>
          <View style={[styles.heartCircleLeft, { backgroundColor: color }]} />
          <View style={[styles.heartCircleRight, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.iconBox}>
      <View style={[styles.personHead, { backgroundColor: color }]} />
      <View style={[styles.personBody, { backgroundColor: color }]} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.header,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 13, fontWeight: "500" },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tab.home"),
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: t("tab.browse"),
          tabBarIcon: ({ color }) => <TabIcon name="grid" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t("tab.favorites"),
          tabBarIcon: ({ color }) => <TabIcon name="heart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tab.settings"),
          tabBarIcon: ({ color }) => <TabIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  homeRoof: {
    position: "absolute",
    top: 1,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  homeBody: {
    position: "absolute",
    bottom: 2,
    width: 15,
    height: 12,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  gridIcon: {
    width: 20,
    height: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  gridCell: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  heartBase: {
    width: 13,
    height: 13,
    marginTop: 4,
    transform: [{ rotate: "45deg" }],
  },
  heartCircleLeft: {
    position: "absolute",
    left: -6,
    top: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
  },
  heartCircleRight: {
    position: "absolute",
    left: 0,
    top: -6,
    width: 13,
    height: 13,
    borderRadius: 7,
  },
  personHead: {
    position: "absolute",
    top: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  personBody: {
    position: "absolute",
    bottom: 1,
    width: 19,
    height: 11,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
