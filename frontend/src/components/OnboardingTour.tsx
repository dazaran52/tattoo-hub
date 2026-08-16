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
            description: t('Auto.text_0f49ba'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-crm',
          popover: {
            title: t('Auto.text_5eca2a'),
            description: t('Auto.text_650666'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-feed',
          popover: {
            title: t('Auto.text_6fca6d'),
            description: t('Auto.text_b429a6'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-portfolio',
          popover: {
            title: t('Auto.text_8119f7'),
            description: t('Auto.text_1dea20'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-messages',
          popover: {
            title: t('Auto.text_fd480b'),
            description: t('Auto.text_c84c18'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-profile',
          popover: {
            title: t('profileAndSettings'),
            description: t('Auto.text_1abdcf'),
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
