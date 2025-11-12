# Heliochime Project

## Overview

This is a full-stack web application that creates an interactive solar wind chime system. The project transforms real-time solar wind data from NOAA DSCOVR satellite into musical chords and hardware control signals for ESP32-based chimes. The application fetches solar wind parameters (velocity, density, magnetic field) and maps them to musical notes, creating an auditory representation of space weather conditions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with a dark space-themed color scheme
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Audio Engine**: Web Audio API for real-time chord generation and playback

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for solar wind data, mapping configurations, and hardware control
- **Data Fetching**: Real-time integration with NOAA SWPC APIs for solar wind plasma data
- **Storage Strategy**: In-memory storage implementation with interface for future database integration

### Data Storage Solutions
- **Database**: PostgreSQL configured through Drizzle ORM
- **Schema**: Structured tables for solar wind readings, mapping configurations, hardware configs, and system status
- **ORM**: Drizzle with Zod integration for type-safe database operations and validation
- **Connection**: Neon Database serverless PostgreSQL hosting

### Audio Mapping System
- **MIDI Processing**: Custom algorithms to map solar wind parameters to musical notes
- **Chord Generation**: Dynamic chord calculation based on velocity (pitch), density (decay), and magnetic field (detuning)
- **Real-time Playback**: Browser-based audio synthesis using oscillators and envelope shaping

### Hardware Integration
- **Target Platform**: ESP32 microcontroller support
- **Firmware Generation**: Automated C++ code generation for hardware configurations
- **Communication**: REST API endpoints for hardware status monitoring and control
- **Pin Configuration**: Configurable GPIO mapping for chimes, LEDs, and I2C communication

## External Dependencies

### Third-party Services
- **NOAA SWPC API**: Real-time solar wind plasma data from DSCOVR satellite
- **Neon Database**: Serverless PostgreSQL hosting for production data storage

### Development Tools
- **Replit Integration**: Development environment optimizations and runtime error handling
- **Vite Plugins**: Hot module replacement, React support, and Replit-specific tooling

### UI and Styling
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom space weather theming
- **Lucide React**: Icon library for consistent iconography

### Audio and MIDI
- **Web Audio API**: Browser-native audio synthesis and processing
- **Custom MIDI Mapping**: Proprietary algorithms for solar wind to musical note conversion

### Database and Validation
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect
- **Zod**: Runtime type validation and schema definition
- **Drizzle-Zod**: Integration package for seamless schema validation