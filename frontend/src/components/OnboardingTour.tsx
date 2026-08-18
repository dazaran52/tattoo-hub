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
            description: t('yourCurrentFundBalance'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-crm',
          popover: {
            title: t('crm5'),
            description: t('manageAllYourClients'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-feed',
          popover: {
            title: t('leadMarketplace'),
            description: t('newRequestsAndOrders'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-portfolio',
          popover: {
            title: t('yourPortfolio'),
            description: t('uploadPhotosOfYour'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-messages',
          popover: {
            title: t('messagesAndChats'),
            description: t('hereYouCanCommunicate'),
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tour-profile',
          popover: {
            title: t('profileAndSettings'),
            description: t('fillOutYourProfile'),
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
