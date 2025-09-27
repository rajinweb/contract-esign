import { Recipient } from "@/types/types";
import { Link, Plus } from "lucide-react";


export default function RecipientsList({ recipients = [], onAddRecipients }: { recipients: Recipient[], onAddRecipients: () => void }) {
    return (
        <>
         <div className="flex items-center justify-between text-sm border-b border-gray-200  -mx-4 px-4 pb-2">
              <span>Recipients: 0 </span><button  className={`primary-button p-1 rounded-full`}  onClick={onAddRecipients} title={'Add Recipient'} > <Plus size={16}/> </button>
        </div>
        <p className="text-xs text-gray-800 uppercase my-4">Select recipient(s) for signature, data, or review.</p>  
          <div id="recipient-list-container" className="space-y-2 w-full max-h-[150px] overflow-y-auto ">
            {recipients.length === 0 ? (
              <div className="flex items-center bg-blue-50 rounded-md shadow-sm text-xs p-1 w-full h-full">
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mx-2">
                  N
                </div>
                <div className="text-gray-800">
                  No Recipient assigned yet.                 
                </div>
              </div>
            ) : (
              recipients.map((recipient, index) => (
                <div key={recipient.id} className="flex items-center bg-blue-50 rounded-md shadow-sm text-xs p-1 w-full">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mx-2">
                    {recipient.name ? recipient.name.charAt(0).toUpperCase() : 'R'}
                  </div>
                  <div className="text-gray-800 flex-1">
                    <div className="font-medium">{recipient.name || `Recipient ${index + 1}`}</div>
                    <div className="text-xs text-gray-500">{recipient.email}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Link size={12}/> {recipient.order} fields
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
           
 
        </>
    )
}