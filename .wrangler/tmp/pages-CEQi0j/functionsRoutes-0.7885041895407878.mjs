import { onRequestGet as __api_mapping_active_ts_onRequestGet } from "/Volumes/VIXinSSD/SolarChime/functions/api/mapping/active.ts"
import { onRequestOptions as __api_mapping_active_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/mapping/active.ts"
import { onRequestOptions as __api_mapping_calculate_chord_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/mapping/calculate-chord.ts"
import { onRequestPost as __api_mapping_calculate_chord_ts_onRequestPost } from "/Volumes/VIXinSSD/SolarChime/functions/api/mapping/calculate-chord.ts"
import { onRequestOptions as __api_mapping_test_condition_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/mapping/test-condition.ts"
import { onRequestPost as __api_mapping_test_condition_ts_onRequestPost } from "/Volumes/VIXinSSD/SolarChime/functions/api/mapping/test-condition.ts"
import { onRequestGet as __api_settings_ambient_ts_onRequestGet } from "/Volumes/VIXinSSD/SolarChime/functions/api/settings/ambient.ts"
import { onRequestOptions as __api_settings_ambient_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/settings/ambient.ts"
import { onRequestPost as __api_settings_ambient_ts_onRequestPost } from "/Volumes/VIXinSSD/SolarChime/functions/api/settings/ambient.ts"
import { onRequestGet as __api_solar_wind_current_ts_onRequestGet } from "/Volumes/VIXinSSD/SolarChime/functions/api/solar-wind/current.ts"
import { onRequestOptions as __api_solar_wind_current_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/solar-wind/current.ts"
import { onRequestOptions as __api_solar_wind_fetch_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/solar-wind/fetch.ts"
import { onRequestPost as __api_solar_wind_fetch_ts_onRequestPost } from "/Volumes/VIXinSSD/SolarChime/functions/api/solar-wind/fetch.ts"
import { onRequestGet as __api_solar_wind_history_ts_onRequestGet } from "/Volumes/VIXinSSD/SolarChime/functions/api/solar-wind/history.ts"
import { onRequestOptions as __api_solar_wind_history_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/solar-wind/history.ts"
import { onRequestGet as __api_space_weather_comprehensive_ts_onRequestGet } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/comprehensive.ts"
import { onRequestOptions as __api_space_weather_comprehensive_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/comprehensive.ts"
import { onRequestGet as __api_space_weather_electron_flux_ts_onRequestGet } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/electron-flux.ts"
import { onRequestOptions as __api_space_weather_electron_flux_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/electron-flux.ts"
import { onRequestGet as __api_space_weather_k_index_ts_onRequestGet } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/k-index.ts"
import { onRequestOptions as __api_space_weather_k_index_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/k-index.ts"
import { onRequestGet as __api_space_weather_magnetometer_ts_onRequestGet } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/magnetometer.ts"
import { onRequestOptions as __api_space_weather_magnetometer_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/magnetometer.ts"
import { onRequestGet as __api_space_weather_proton_flux_ts_onRequestGet } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/proton-flux.ts"
import { onRequestOptions as __api_space_weather_proton_flux_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/proton-flux.ts"
import { onRequestGet as __api_space_weather_xray_flux_ts_onRequestGet } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/xray-flux.ts"
import { onRequestOptions as __api_space_weather_xray_flux_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/space-weather/xray-flux.ts"
import { onRequestGet as __api_system_status_ts_onRequestGet } from "/Volumes/VIXinSSD/SolarChime/functions/api/system/status.ts"
import { onRequestOptions as __api_system_status_ts_onRequestOptions } from "/Volumes/VIXinSSD/SolarChime/functions/api/system/status.ts"

export const routes = [
    {
      routePath: "/api/mapping/active",
      mountPath: "/api/mapping",
      method: "GET",
      middlewares: [],
      modules: [__api_mapping_active_ts_onRequestGet],
    },
  {
      routePath: "/api/mapping/active",
      mountPath: "/api/mapping",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_mapping_active_ts_onRequestOptions],
    },
  {
      routePath: "/api/mapping/calculate-chord",
      mountPath: "/api/mapping",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_mapping_calculate_chord_ts_onRequestOptions],
    },
  {
      routePath: "/api/mapping/calculate-chord",
      mountPath: "/api/mapping",
      method: "POST",
      middlewares: [],
      modules: [__api_mapping_calculate_chord_ts_onRequestPost],
    },
  {
      routePath: "/api/mapping/test-condition",
      mountPath: "/api/mapping",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_mapping_test_condition_ts_onRequestOptions],
    },
  {
      routePath: "/api/mapping/test-condition",
      mountPath: "/api/mapping",
      method: "POST",
      middlewares: [],
      modules: [__api_mapping_test_condition_ts_onRequestPost],
    },
  {
      routePath: "/api/settings/ambient",
      mountPath: "/api/settings",
      method: "GET",
      middlewares: [],
      modules: [__api_settings_ambient_ts_onRequestGet],
    },
  {
      routePath: "/api/settings/ambient",
      mountPath: "/api/settings",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_settings_ambient_ts_onRequestOptions],
    },
  {
      routePath: "/api/settings/ambient",
      mountPath: "/api/settings",
      method: "POST",
      middlewares: [],
      modules: [__api_settings_ambient_ts_onRequestPost],
    },
  {
      routePath: "/api/solar-wind/current",
      mountPath: "/api/solar-wind",
      method: "GET",
      middlewares: [],
      modules: [__api_solar_wind_current_ts_onRequestGet],
    },
  {
      routePath: "/api/solar-wind/current",
      mountPath: "/api/solar-wind",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_solar_wind_current_ts_onRequestOptions],
    },
  {
      routePath: "/api/solar-wind/fetch",
      mountPath: "/api/solar-wind",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_solar_wind_fetch_ts_onRequestOptions],
    },
  {
      routePath: "/api/solar-wind/fetch",
      mountPath: "/api/solar-wind",
      method: "POST",
      middlewares: [],
      modules: [__api_solar_wind_fetch_ts_onRequestPost],
    },
  {
      routePath: "/api/solar-wind/history",
      mountPath: "/api/solar-wind",
      method: "GET",
      middlewares: [],
      modules: [__api_solar_wind_history_ts_onRequestGet],
    },
  {
      routePath: "/api/solar-wind/history",
      mountPath: "/api/solar-wind",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_solar_wind_history_ts_onRequestOptions],
    },
  {
      routePath: "/api/space-weather/comprehensive",
      mountPath: "/api/space-weather",
      method: "GET",
      middlewares: [],
      modules: [__api_space_weather_comprehensive_ts_onRequestGet],
    },
  {
      routePath: "/api/space-weather/comprehensive",
      mountPath: "/api/space-weather",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_space_weather_comprehensive_ts_onRequestOptions],
    },
  {
      routePath: "/api/space-weather/electron-flux",
      mountPath: "/api/space-weather",
      method: "GET",
      middlewares: [],
      modules: [__api_space_weather_electron_flux_ts_onRequestGet],
    },
  {
      routePath: "/api/space-weather/electron-flux",
      mountPath: "/api/space-weather",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_space_weather_electron_flux_ts_onRequestOptions],
    },
  {
      routePath: "/api/space-weather/k-index",
      mountPath: "/api/space-weather",
      method: "GET",
      middlewares: [],
      modules: [__api_space_weather_k_index_ts_onRequestGet],
    },
  {
      routePath: "/api/space-weather/k-index",
      mountPath: "/api/space-weather",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_space_weather_k_index_ts_onRequestOptions],
    },
  {
      routePath: "/api/space-weather/magnetometer",
      mountPath: "/api/space-weather",
      method: "GET",
      middlewares: [],
      modules: [__api_space_weather_magnetometer_ts_onRequestGet],
    },
  {
      routePath: "/api/space-weather/magnetometer",
      mountPath: "/api/space-weather",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_space_weather_magnetometer_ts_onRequestOptions],
    },
  {
      routePath: "/api/space-weather/proton-flux",
      mountPath: "/api/space-weather",
      method: "GET",
      middlewares: [],
      modules: [__api_space_weather_proton_flux_ts_onRequestGet],
    },
  {
      routePath: "/api/space-weather/proton-flux",
      mountPath: "/api/space-weather",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_space_weather_proton_flux_ts_onRequestOptions],
    },
  {
      routePath: "/api/space-weather/xray-flux",
      mountPath: "/api/space-weather",
      method: "GET",
      middlewares: [],
      modules: [__api_space_weather_xray_flux_ts_onRequestGet],
    },
  {
      routePath: "/api/space-weather/xray-flux",
      mountPath: "/api/space-weather",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_space_weather_xray_flux_ts_onRequestOptions],
    },
  {
      routePath: "/api/system/status",
      mountPath: "/api/system",
      method: "GET",
      middlewares: [],
      modules: [__api_system_status_ts_onRequestGet],
    },
  {
      routePath: "/api/system/status",
      mountPath: "/api/system",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_system_status_ts_onRequestOptions],
    },
  ]