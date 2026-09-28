// Adapted from beUI (https://beui.dev) — MIT License, Copyright (c) 2026 Saurabh Chauhan. See web/THIRD_PARTY_NOTICES.md.
'use client';

import { createContext } from 'react';

export type MessageSide = 'start' | 'end';

export const MessageSideContext = createContext<MessageSide | undefined>(undefined);
