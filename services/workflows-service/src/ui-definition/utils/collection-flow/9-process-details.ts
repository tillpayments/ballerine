const validationSchema = {
  type: 'object',
  required: ['entity'],
  properties: {
    entity: {
      type: 'object',
      required: ['data'],
      properties: {
        data: {
          type: 'object',
          required: ['additionalInfo'],
          properties: {
            additionalInfo: {
              type: 'object',
              required: ['store'],
              properties: {
                store: {
                  type: 'object',
                  required: ['processingDetails'],
                  properties: {
                    processingDetails: {
                      type: 'object',
                      required: [
                        'monthlySalesVolume',
                        'monthlyTransactions',
                        'averageTicketAmount',
                        'mainCategory',
                      ],
                      // errorMessage: {
                      //   minLength: {
                      //     monthlySalesVolume: 'Monthly Sales Volume is required.',
                      //     monthlyTransactions: 'Monthly Transactions are required.',
                      //     averageTicketAmount: 'Average Ticket Amount is required.',
                      //     mainCategory: 'Main Category is required.',
                      //     businessModel: 'Business Model is required.',
                      //   }
                      // },
                      // errorMessage: {
                      //   minLength: {
                      //     monthlySalesVolume: 'Monthly Sales Volume is required.',
                      //     monthlyTransactions: 'Monthly Transactions are required.',
                      //     averageTicketAmount: 'Average Ticket Amount is required.',
                      //     mainCategory: 'Main Category is required.',
                      //     businessModel: 'Business Model is required.',
                      //     isSpikeInSales: 'Is Spike In Sales is required.',
                      //     spikeSalesAverageVolume: 'Spike Sales Average Volume is required.',
                      //     spikeTransactionNumber: 'Spike Transaction Number is required.',
                      //     spikeOfVolumeInRegion: 'Spike Of Volume In Region is required.',
                      //   }
                      // },
                      properties: {
                        monthlySalesVolume: {type: 'string', minLength: 1},
                        monthlyTransactions: {type: 'string', minLength: 1},
                        averageTicketAmount: {type: 'string', minLength: 1},
                        mainCategory: {type: 'string', minLength: 1},
                        businessModel:{type: 'string', minLength: 1},
                        isSpikeInSales: { type: 'boolean', default: false },
                        spikeSalesAverageVolume: {type: 'string', minLength: 1},
                        spikeTransactionNumber:{type: 'string', minLength: 1},
                        spikeOfVolumeInRegion: {type: 'string', minLength: 1},
                      },
                      errorMessage: 'This field is required.',
                      if: {
                        properties: {
                          isSpikeInSales: {
                            const: true
                          },
                        }
                      },
                      then: {
                        required: [
                          'monthlySalesVolume',
                          'monthlyTransactions',
                          'averageTicketAmount',
                          'isSpikeInSales',
                          'spikeSalesAverageVolume',
                          'spikeOfVolumeInRegion',
                          'mainCategory',
                        ],
                      }
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const isSpikeInSaleVisibility = {
'==': [{ var: 'entity.data.additionalInfo.store.processingDetails.isSpikeInSales' }, true],
};

const isCustomBusinessModel = {
'==': [{ var: 'entity.data.additionalInfo.store.processingDetails.mainCategory' }, 'Other'],
};

export const ProcessingDetails = {
type: 'page',
number: 9,
stateName: 'processing_details',
name: 'Processing Details',
pageValidator: {
  type: 'json-schema',
  value: validationSchema,
},
elements: [
  {
    type: 'mainContainer',
    elements: [
      {
        type: 'container',
        elements: [
          {
            type: 'h1',
            options: {
              text: 'Processing Details',
            },
          },
        ],
      },
      {
        type: 'json-form',
        options: {
          jsonFormDefinition: {
            required: [
              'monthly-sales-volume-input',
              'monthly-number-transactions-input',
              'average-ticket-sales-input',
            ],
          },
        },
        elements: [
          {
            name: 'monthly-sales-volume-input',
            type: 'json-form:text',
            valueDestination:
              'entity.data.additionalInfo.store.processingDetails.monthlySalesVolume',
            options: {
              label: 'Monthly Sales Volume (CNY)',
              hint: '5,000,000',
              jsonFormDefinition: {
                type: 'string',
              },
            },
          },
          {
            name: 'monthly-number-transactions-input',
            type: 'json-form:text',
            valueDestination:
              'entity.data.additionalInfo.store.processingDetails.monthlyTransactions',
            options: {
              label: 'Monthly Number Of Transactions',
              hint: '500',
              jsonFormDefinition: {
                type: 'string',
              },
            },
          },
          {
            name: 'est-monthly-sales-volume-clipspay-input',
            type: 'json-form:text',
            valueDestination:
              'entity.data.additionalInfo.store.processingDetails.estimatedMonthlySalesClipsPay',
            options: {
              label: 'Est. Monthly Sales Volume through ClipsPay (CNY)',
              hint: '400,000',
              jsonFormDefinition: {
                type: 'string',
              },
            },
          },
          {
            name: 'est-monthly-transactions-clipspay-input',
            type: 'json-form:text',
            valueDestination:
              'entity.data.additionalInfo.store.processingDetails.estimatedMonthlyTransactionsClipsPay',
            options: {
              label: 'Est. Monthly Number of Transactions through ClipsPay',
              hint: '150',
              jsonFormDefinition: {
                type: 'string',
              },
            },
          },
          {
            name: 'average-ticket-sales-input',
            type: 'json-form:text',
            valueDestination:
              'entity.data.additionalInfo.store.processingDetails.averageTicketAmount',
            options: {
              label: 'Average Ticket Amount (CNY)',
              hint: '25',
              jsonFormDefinition: {
                type: 'string',
              },
            },
          },
          {
            name: 'minimum-ticket-sales-input',
            type: 'json-form:text',
            valueDestination:
              'entity.data.additionalInfo.store.processingDetails.minimumTicketAmount',
            options: {
              label: 'Minimum Ticket Amount (CNY)',
              hint: '300',
              jsonFormDefinition: {
                type: 'string',
              },
            },
          },
          {
            name: 'maximum-ticket-sales-input',
            type: 'json-form:text',
            valueDestination:
              'entity.data.additionalInfo.store.processingDetails.maximumTicketAmount',
            options: {
              label: 'Maximum Ticket Amount (CNY)',
              hint: '2000',
              jsonFormDefinition: {
                type: 'string',
              },
            },
          },
          {
            name: 'spike-in-transactions-input',
            type: 'checkbox',
            valueDestination: 'entity.data.additionalInfo.store.processingDetails.isSpikeInSales',
            options: {
              label: 'There are spikes in transactions (e.g., promotions, events, etc.)',
              jsonFormDefinition: {
                type: 'boolean',
              },
            },
          },
        ],
      },
      {
        type: 'json-form',
        options: {
          jsonFormDefinition: {
            required: ['spike-sales-volume-input', 'split-of-volume-in-region'],
          },
        },
        visibleOn: [
          {
            type: 'json-logic',
            value: isSpikeInSaleVisibility,
          },
        ],
        elements: [
          {
            name: 'spike-sales-volume-input',
            type: 'json-form:text',
            valueDestination:
              'entity.data.additionalInfo.store.processingDetails.spikeSalesAverageVolume',
            options: {
              label: 'Spike Sales Average Volume',
              hint: '150,000',
              jsonFormDefinition: {
                type: 'string',
              },
            },
          },
          {
            name: 'spike-sales-transaction-number-input',
            type: 'json-form:text',
            valueDestination:
              'entity.data.additionalInfo.store.processingDetails.spikeTransactionNumber',
            options: {
              label: 'Spike Transaction Number',
              hint: '200',
              jsonFormDefinition: {
                type: 'string',
              },
            },
          },
          {
            name: 'spike-split-of-volume-in-region',
            type: 'json-form:text',
            valueDestination:
              'entity.data.additionalInfo.store.processingDetails.spikeOfVolumeInRegion',
            options: {
              label: 'Split of volume by regions in % (divided by comma)',
              hint: 'Asia 70%, Europe 30%',
              jsonFormDefinition: {
                type: 'string',
              },
            },
          },
        ],
      },
      {
        type: 'h3',
        value: 'Main Contact',
      },
      {
        type: 'json-form',
        options: {
          jsonFormDefinition: {
            required: ['main-category-input'],
          },
        },
        elements: [
          {
            name: 'main-category-input',
            type: 'json-form:select',
            valueDestination: 'entity.data.additionalInfo.store.processingDetails.mainCategory',
            options: {
              jsonFormDefinition: {
                type: 'string',
                oneOf: [
                  {
                    title: 'B2C',
                    const: 'B2C',
                  },
                  {
                    title: 'B2B',
                    const: 'B2B',
                  },
                  {
                    title: 'C2C',
                    const: 'C2C',
                  },
                  {
                    title: 'Other',
                    const: 'Other',
                  },
                ],
              },
              label: 'Customer Category',
              hint: 'B2C',
            },
          },
        ],
      },
      {
        type: 'json-form',
        options: {
          jsonFormDefinition: {
            required: ['business-model-input'],
          },
        },
        elements: [
          {
            name: 'business-model-input',
            valueDestination: 'entity.data.additionalInfo.store.processingDetails.businessModel',
            options: {
              jsonFormDefition: {
                type: 'string',
                oneOf: [
                  {
                    title: 'Membership',
                    const: 'Membership',
                  },
                  {
                    title: 'Direct Purchase',
                    const: 'Direct Purchase',
                  },
                  {
                    title: 'Other',
                    const: 'Other',
                  },
                ],
              },
            },
          },
        ],
      },
      {
        type: 'json-form',
        visibleOn: [
          {
            type: 'json-logic',
            value: isCustomBusinessModel,
          },
        ],
        elements: [
          {
            name: 'other-business-model-input',
            type: 'json-form:text',
            valueDestination:
              'entity.data.additionalInfo.store.processingDetails.otherBusinessModel',
            options: {
              label: 'Business Model',
              jsonFormDefinition: {
                type: 'string',
              },
            },
          },
        ],
      },
      {
        name: 'next-page-button',
        type: 'json-form:button',
        options: {
          uiDefinition: {
            classNames: ['align-right', 'padding-top-10'],
          },
          text: 'Continue',
        },
        availableOn: [
          {
            type: 'json-schema',
            value: validationSchema,
          },
          {
            type: 'json-logic',
            value: {'==': {var: 'some.shitty.data'}}
          }
        ],
      },
    ],
  },
],
actions: [
  {
    type: 'definitionEvent',
    params: {
      eventName: 'PREVIOUS',
    },
    dispatchOn: {
      uiEvents: [{ event: 'onClick', uiElementName: 'previous-page-button' }],
    },
  },
  {
    type: 'definitionEvent',
    params: {
      eventName: 'NEXT',
    },
    dispatchOn: {
      uiEvents: [{ event: 'onClick', uiElementName: 'next-page-button' }],
      rules: [
        {
          type: 'json-schema',
          value: validationSchema,
        },
      ],
    },
  },
],
};
