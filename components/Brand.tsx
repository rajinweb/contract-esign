import { FileSignature } from "lucide-react"
import Link from "next/link"

const Brand=()=>{
    return(
           <Link href="/" className="flex items-center space-x-2">
            <FileSignature className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">SecureSign</span> 
          </Link>
    )
}
export default Brand