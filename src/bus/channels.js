/**
 * Message Channel Definitions
 * Defines priority lanes for the message bus
 */
export const Channels = {
    HIGH: 'high',     // Urgent: User interactions, critical errors
    DEFAULT: 'default', // Standard: Inter-unit communication
    LOW: 'low'       // Background: Logging, cleanup, maintenance
};

export const Priorities = {
    [Channels.HIGH]: 3,
    [Channels.DEFAULT]: 2,
    [Channels.LOW]: 1
};
