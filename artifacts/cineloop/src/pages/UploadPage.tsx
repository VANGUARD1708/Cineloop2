import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateFilm } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Upload, Film, FileText, ImageIcon, ToggleLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  title: z.string().min(2, "Title is too short").max(100),
  description: z.string().min(10, "Description needs more detail"),
  genre: z.string().min(1, "Please select a genre"),
  thumbnailUrl: z.string().url("Must be a valid URL").or(z.literal("")),
  isSerialised: z.boolean().default(false),
});

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateFilm();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      genre: "Sci-Fi",
      thumbnailUrl: "",
      isSerialised: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({
          title: "Upload Initialized",
          description: "Your creation has entered the loop.",
        });
        setLocation("/profile"); // or redirect to film page if we had one
      },
      onError: () => {
        toast({
          title: "Upload Failed",
          description: "The system rejected your entry. Try again.",
          variant: "destructive"
        });
      }
    });
  }

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-8 pt-8 pb-24 flex justify-center">
      <div className="w-full max-w-2xl">
        <header className="mb-10 text-center">
          <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="text-primary" size={28} />
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-2">Create Protocol</h1>
          <p className="text-muted-foreground">Inject new narrative paths into the system.</p>
        </header>

        <div className="bg-card border border-border p-6 md:p-8 rounded-lg shadow-2xl shadow-black">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Film size={16} /> Title Designator
              </label>
              <input 
                {...form.register("title")}
                className="w-full bg-black border border-white/10 rounded-md p-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-serif text-xl"
                placeholder="e.g. Neon Protocol"
              />
              {form.formState.errors.title && (
                <p className="text-destructive text-sm mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} /> Narrative Summary
              </label>
              <textarea 
                {...form.register("description")}
                className="w-full bg-black border border-white/10 rounded-md p-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all min-h-[120px]"
                placeholder="What happens in this loop?"
              />
              {form.formState.errors.description && (
                <p className="text-destructive text-sm mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Classification</label>
                <select 
                  {...form.register("genre")}
                  className="w-full bg-black border border-white/10 rounded-md p-3 text-white focus:outline-none focus:border-primary appearance-none"
                >
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Cyberpunk">Cyberpunk</option>
                  <option value="Thriller">Thriller</option>
                  <option value="Horror">Horror</option>
                  <option value="Drama">Drama</option>
                  <option value="Mystery">Mystery</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon size={16} /> Key Visual URL
                </label>
                <input 
                  {...form.register("thumbnailUrl")}
                  className="w-full bg-black border border-white/10 rounded-md p-3 text-white focus:outline-none focus:border-primary transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white flex items-center gap-2">
                  <ToggleLeft size={20} className={form.watch("isSerialised") ? "text-primary" : "text-zinc-500"} />
                  Serialized Format
                </h4>
                <p className="text-sm text-zinc-500">Will this have multiple connected episodes?</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...form.register("isSerialised")} className="sr-only peer" />
                <div className="w-11 h-6 bg-black border border-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <button 
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-md uppercase tracking-widest mt-8 transition-all disabled:opacity-50 border border-primary/50 shadow-[0_0_20px_rgba(220,20,60,0.2)] hover:shadow-[0_0_30px_rgba(220,20,60,0.4)]"
            >
              {createMutation.isPending ? "Initializing..." : "Initialize Upload"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
