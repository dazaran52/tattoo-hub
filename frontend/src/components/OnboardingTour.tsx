'use client'
import { useTranslations } from "next-intl";


import { useEffect, useCallback } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

interface OnboardingTourProps {
  startTour?: boolean
  onTourEnd?: () => void
}

export function OnboardingTour({ startTour, onTourEnd }: OnboardingTourProps) {
  const t = useTranslations();
  const initTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      doneBtnText: t('guide.understand'),
      nextBtnText: t('guide.next'),
      prevBtnText: t('back'),
      onPopoverRender: (popover, { config, state }) => {
        // Apply custom styling
        popover.wrapper.classList.add('dark:bg-neutral-900', 'dark:text-white', 'dark:border-neutral-800')
      },
      onDestroyed: () => {
        if (onTourEnd) {
          onTourEnd()
        }
      },
      steps: [
        {
          element: '#tour-balance',
          popover: {
            title: t('yourBalance'),
            description: t('key_0f49ba'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-crm',
          popover: {
            title: t('crm5'),
            description: t('key_650666'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-feed',
          popover: {
            title: t('key_6fca6d'),
            description: t('key_b429a6'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-portfolio',
          popover: {
            title: t('key_8119f7'),
            description: t('key_1dea20'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-messages',
          popover: {
            title: t('key_fd480b'),
            description: t('key_c84c18'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-profile',
          popover: {
            title: t('profileAndSettings'),
            description: t('key_1abdcf'),
            side: 'left',
            align: 'start'
          }
        }
      ]
    })

    driverObj.drive()
  }, [onTourEnd])

  useEffect(() => {
    if (startTour) {
      initTour()
    }
  }, [startTour, initTour])

  return null
}
