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
        // Classes are applied globally via globals.css
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
            title: t('guide.tourBalanceTitle'),
            description: t('guide.tourBalanceDesc'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-crm',
          popover: {
            title: t('guide.tourCrmTitle'),
            description: t('guide.tourCrmDesc'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-feed',
          popover: {
            title: t('guide.tourFeedTitle'),
            description: t('guide.tourFeedDesc'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-portfolio',
          popover: {
            title: t('guide.tourPortfolioTitle'),
            description: t('guide.tourPortfolioDesc'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-messages',
          popover: {
            title: t('guide.tourMessagesTitle'),
            description: t('guide.tourMessagesDesc'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-profile',
          popover: {
            title: t('guide.tourProfileTitle'),
            description: t('guide.tourProfileDesc'),
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
