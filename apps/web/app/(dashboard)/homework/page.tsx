import { PenSquare } from "lucide-react";
import { getHomework } from "@/app/actions/homework";
import { getClasses } from "@/app/actions/classes";
import { HomeworkClient } from "./HomeworkClient";

export default async function HomeworkPage() {
  const [homework, classes] = await Promise.all([getHomework(), getClasses()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Homework</h1>
          <p className="text-sm text-text-2 mt-0.5">
            Assign and track homework across your classes.
          </p>
        </div>
      </div>

      {homework.length === 0 && classes.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <PenSquare size={40} className="text-muted mx-auto mb-3" />
          <h3 className="font-semibold text-text">No homework assigned</h3>
          <p className="text-sm text-text-2 mt-1">
            Create a class first, then assign homework here.
          </p>
        </div>
      ) : (
        <HomeworkClient homework={homework} classes={classes} />
      )}
    </div>
  );
}
